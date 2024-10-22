import { MikroORM, Options } from '@mikro-orm/core';
import { CheckResult, DbConfig, DBType, RateLimitOptions } from './lib/types';
import { RateLimit } from './lib/entity';
import { dbDefualtName } from './lib/constants';
import { emptyObj, userReachMaxRateLimit } from './lib/messages';
import { MongoDriver } from '@mikro-orm/mongodb';
import { MySqlDriver } from '@mikro-orm/mysql';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { isObjectEmpty, devDebugger } from './lib/helpers';
import Joi = require('joi');


function getDriver(dbType: DBType) {
    switch (dbType) {
        case 'postgresql':
            return PostgreSqlDriver;
        case 'mysql':
            return MySqlDriver;
        case 'mongodb':
            return MongoDriver;
        default:
            throw new Error('Unsupported database type');
    }
}

export const schema: Joi.Root = Joi

export async function checkObject(
    obj: any,
    schema: Joi.ObjectSchema<any>,
    devMode: boolean = true
): Promise<CheckResult> {

    let result: CheckResult = {
        isValid: false,
    };

    if (isObjectEmpty(obj)) {
        result.log = emptyObj
        return result;
    }


    try {
        await schema.validateAsync(obj).then(() => {
            result.isValid = true;
        });
    } catch (error) {
        result.log = error;
    }

    devDebugger(result, devMode)
    return result;
}

export async function rateLimit(
    userId: string,
    options: RateLimitOptions,
    dbConfig: DbConfig,
    devMode: boolean = true
): Promise<CheckResult> {


    let result: CheckResult = {
        isValid: true,
    };

    const config: Options = {
        dbName: dbConfig.dbName || dbDefualtName,
        clientUrl: dbConfig.dbURI,
        entities: [RateLimit],
        debug: dbConfig.dbDebug,
        driver: getDriver(dbConfig.dbType),
        allowGlobalContext: true
    };

    const orm = await MikroORM.init(config)
    const entityManager = orm.em.fork()

    const currentTime = new Date();
    const cycleStart = new Date(currentTime.getTime() - options.cycleTime * 1000);

    let rateLimit = await entityManager.findOne(RateLimit, { userId });

    if (!rateLimit) {
        rateLimit = new RateLimit();
        rateLimit.userId = userId;
        rateLimit.requestCount = 0;
        rateLimit.lastRequest = currentTime;

        devDebugger(rateLimit, devMode)
        entityManager.create(RateLimit, rateLimit)
        await entityManager.flush();

        return result;
    } else {

        if (rateLimit.lastRequest < cycleStart) {
            rateLimit.requestCount = 1;
            rateLimit.lastRequest = currentTime;

            devDebugger(rateLimit, devMode)
            await entityManager.persistAndFlush(rateLimit)

            return result;
        }

        if (rateLimit.requestCount < options.maxRequests) {
            rateLimit.requestCount++;
            rateLimit.lastRequest = currentTime;

            devDebugger(rateLimit, devMode)
            await entityManager.persistAndFlush(rateLimit)

            return result;
        }
    }

    result = {
        isValid: false,
        log: userReachMaxRateLimit
    }
    devDebugger(result, devMode)
    return result
}
