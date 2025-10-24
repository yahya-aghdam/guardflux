import { MikroORM, Options } from '@mikro-orm/core';
import { CheckResult, DbConfig, DBType, RateLimitOptions } from './lib/types';
import { RateLimit } from './lib/entity';
import { dbDefaultName } from './lib/constants';
import { emptyObj, userReachMaxRateLimit } from './lib/messages';
import { MongoDriver } from '@mikro-orm/mongodb';
import { MySqlDriver } from '@mikro-orm/mysql';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { isObjectEmpty, devDebugger } from './lib/helpers';
import { createClient } from 'redis';
import Joi = require('joi');


/**
 * Returns the appropriate MikroORM driver based on the specified database type.
 * 
 * @param dbType - The type of the database. It can be one of 'postgresql', 'mysql', or 'mongodb'.
 * @returns The MikroORM driver for the specified database type.
 * @throws An error if the provided database type is not supported.
 */
export function getDriver(dbType: DBType) {
    switch (dbType) {
        case 'postgresql':
            return PostgreSqlDriver; // Returns the PostgreSQL driver
        case 'mysql':
            return MySqlDriver;      // Returns the MySQL driver
        case 'mongodb':
            return MongoDriver;      // Returns the MongoDB driver
        case 'redis':
            // Redis does not use a MikroORM driver; handled separately in rateLimit
            throw new Error('Redis is not supported by MikroORM. Use dbType "redis" to run the Redis implementation in rateLimit.');
        default:
            throw new Error('Unsupported database type'); // Throws an error if the database type is not recognized
    }
}


/**
 * The schema constant is initialized as a Joi Root instance, 
 * which provides the main API for creating schemas.
 * 
 * @constant {Joi.Root} schema - The root Joi object used for schema validation.
 */
export const schema: Joi.Root = Joi; // Exports the Joi root object for use in validation


/**
 * Checks if an object conforms to a specified Joi schema and returns the validation result.
 *
 * @param {any} obj - The object to validate against the schema.
 * @param {Joi.ObjectSchema<any>} schema - The Joi schema to validate the object against.
 * @param {boolean} [devMode=true] - Flag to enable or disable debugging logs. Default is true.
 * @returns {Promise<CheckResult>} - A promise that resolves to a CheckResult object containing 
 *                                    the validation status and any log information.
 */
export async function checkObject(
    obj: any,
    schema: Joi.ObjectSchema<any>,
    devMode: boolean = true
): Promise<CheckResult> {
    let result: CheckResult = {
        isValid: false, // Initialize result with isValid set to false
    };

    // Check if the object is empty
    if (isObjectEmpty(obj)) {
        result.log = emptyObj; // Log the empty object message
        return result; // Return the result early
    }

    try {
        // Validate the object against the schema asynchronously
        await schema.validateAsync(obj).then(() => {
            result.isValid = true; // Set isValid to true if validation passes
        });
    } catch (error) {
        // If validation fails, log the error
        result.log = error;
    }

    // Debugging log if in development mode
    devDebugger(result, devMode);
    return result; // Return the result object
}


/**
 * Implements rate limiting for a user based on specified options.
 * This function checks the user's request count and manages their rate limit status in the database.
 *
 * @param {string} userId - The unique identifier for the user to apply rate limiting.
 * @param {RateLimitOptions} options - Options defining the rate limiting parameters, including the route and maximum requests.
 * @param {DbConfig} dbConfig - Configuration details for connecting to the database.
 * @param {boolean} [devMode=true] - Optional flag to enable debugging output. Defaults to true.
 * @returns {Promise<CheckResult>} - A promise that resolves to a CheckResult object containing 
 *                                    the validation status and any log information.
 */
export async function rateLimit(
    userId: string,
    options: RateLimitOptions,
    dbConfig: DbConfig,
    devMode: boolean = true
): Promise<CheckResult> {

    let result: CheckResult = {
        isValid: true, // Initialize result as valid
    };

    // If Redis is selected, use Redis implementation (simple fixed window using TTL)
    if (dbConfig.dbType === 'redis') {
        const prefix = (dbConfig as DbConfig).redisPrefix || dbDefaultName;
        const key = `${prefix}:${userId}:${options.route}`;

        const client = createClient({ url: dbConfig.dbURI });
        try {
            await client.connect();
            const current = await client.incr(key);
            if (current === 1) {
                // First request in the window, set expiry to cycle time
                await client.expire(key, options.cycleTime);
            }

            devDebugger({ key, current }, devMode);

            await client.disconnect();

            if (current > options.maxRequests) {
                result = { isValid: false, log: userReachMaxRateLimit };
                devDebugger(result, devMode);
                return result;
            }

            return result;
        } catch (err) {
            // On Redis error, treat as allowed (or you may want to return an error)
            devDebugger(err, devMode);
            try { await client.disconnect(); } catch (e) { console.error(e) }
            return result;
        }
    }

    // Configuration for the MikroORM connection
    const config: Options = {
        dbName: dbConfig.dbName || dbDefaultName, // Use provided DB name or default
        clientUrl: dbConfig.dbURI, // MongoDB connection URI
        entities: [RateLimit], // Specify the RateLimit entity to manage
        debug: dbConfig.dbDebug, // Debug mode from DB configuration
        driver: getDriver(dbConfig.dbType), // Determine the database driver based on type
        allowGlobalContext: true // Allow usage of global context for ORM
    };

    // Initialize MikroORM
    const orm = await MikroORM.init(config);
    const entityManager = orm.em.fork(); // Create a fork of the entity manager for isolated operations

    const currentTime = new Date(); // Get the current time
    const cycleStart = new Date(currentTime.getTime() - options.cycleTime * 1000); // Calculate the start time of the current cycle

    // Find the current rate limit record for the user and route
    let rateLimit = await entityManager.findOne(RateLimit, { userId: userId, route: options.route });

    if (!rateLimit) {
        // If no rate limit record exists, create a new one
        rateLimit = new RateLimit();
        rateLimit.userId = userId; // Set user ID
        rateLimit.route = options.route; // Set the current route
        rateLimit.requestCount = 1; // Initialize request count
        rateLimit.lastRequest = currentTime; // Set the last request time

        devDebugger(rateLimit, devMode); // Log the new rate limit record for debugging
        entityManager.create(RateLimit, rateLimit); // Create the new entity
        await entityManager.flush(); // Save changes to the database

        return result; // Return valid result as the rate limit is not exceeded
    } else {
        // If the rate limit record exists, check the last request time
        if (rateLimit.lastRequest <= cycleStart) {
            // If the last request is older than the cycle start, reset the count
            rateLimit.requestCount = 1; // Reset request count
            rateLimit.lastRequest = currentTime; // Update last request time

            devDebugger(rateLimit, devMode); // Log the updated rate limit record for debugging
            await entityManager.persistAndFlush(rateLimit); // Save changes to the database

            return result; // Return valid result as the rate limit is not exceeded
        }

        // If the request count is below the maximum allowed
        if (rateLimit.requestCount < options.maxRequests) {
            rateLimit.requestCount++; // Increment the request count
            rateLimit.lastRequest = currentTime; // Update last request time

            devDebugger(rateLimit, devMode); // Log the updated rate limit record for debugging
            await entityManager.persistAndFlush(rateLimit); // Save changes to the database

            return result; // Return valid result as the rate limit is not exceeded
        }
    }

    // If none of the above conditions are met, the rate limit has been reached
    result = {
        isValid: false, // Set result as invalid
        log: userReachMaxRateLimit // Log the maximum rate limit reached
    };
    devDebugger(result, devMode); // Log the result for debugging
    return result; // Return the result object
}