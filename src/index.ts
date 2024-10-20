import { MikroORM, EntityManager, Options } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqliteDriver } from '@mikro-orm/sqlite';
import { MongoDriver } from '@mikro-orm/mongodb';
import { CheckResult, DBT, Keys, LogInput, RateLimitOptions } from './lib/types';
import { Log, RateLimit } from './lib/entity';
import { dbDefualtName } from './lib/constants';
import { notValidObj, userKeyInDBIsNull, userKeyInDBIsUndefined, userKeyIsNotMatch, userKeyIsUndefined, userReachMaxRateLimit } from './lib/messages';
import Joi = require('joi');


export default class GuardFlux {
    private orm?: MikroORM;
    private em?: EntityManager;
    private dbURI: string;
    private dbType: DBT;
    private dbName: string;
    private log: boolean;
    private debug: boolean;
    public schema: Joi.Root = Joi;

    constructor(dbURI: string, dbType: DBT, dbName: string = dbDefualtName, log: boolean = true, debug: boolean = false) {
        
        if (dbURI == undefined) throw new Error("Database URL is undefined")
        if (dbType == undefined) throw new Error("Database type is undefined")

        this.dbURI = dbURI;
        this.dbType = dbType;
        this.dbName = dbName;
        this.log = log;
        this.debug = debug;

        this.initialize()
    }

    private async initialize() {
        const config: Options = {
            dbName: this.dbName,
            clientUrl: this.dbURI,
            entities: ['dist/**/*.entity.js'],
            entitiesTs: ['src/**/*.entity.ts'],
            debug: process.env.NODE_ENV !== 'production',
            driver: this.getDriver()
        };

        this.orm = await MikroORM.init(config);
        this.em = this.orm.em;
    }

    private getDriver() {
        switch (this.dbType) {
            case 'postgresql':
                return PostgreSqlDriver;
            case 'mysql':
                return MySqlDriver;
            case 'sqlite':
                return SqliteDriver;
            case 'mongodb':
                return MongoDriver;
            default:
                throw new Error('Unsupported database type');
        }
    }

    private debugger(data: LogInput) {
        if (this.debug) {
            console.log(`Function: ${data.function}`)
            console.log(`Message: ${data.message}`)
            console.log(`Meta data: ${data.metaData}`)
            console.log("")
        }
    }


    private async insertLog(data: LogInput): Promise<void> {
        if (this.log) {
            const log = new Log();
            log.message = data.message;
            log.metadata = data.metaData ? JSON.stringify(data.metaData) : undefined;

            this.debugger(data)

            this.em?.persist(log);
            await this.em?.flush();
        }
    }


    async rateLimit(
        userId: string,
        options: RateLimitOptions,
        checkKey: boolean = false,
        keys: Keys | undefined
    ): Promise<boolean> {

        let logInput: LogInput = {
            function: "rateLimit",
            message: "",
            metaData: { userId, options }
        }

        if (checkKey) {
            if (keys?.userKey == undefined) {
                logInput.message = userKeyIsUndefined
                await this.insertLog(logInput)
                return false
            }

            if (keys?.dbUserKey == undefined) {
                logInput.message = userKeyInDBIsUndefined
                await this.insertLog(logInput)
                return false
            }

            if (keys?.dbUserKey == null) {
                logInput.message = userKeyInDBIsNull
                await this.insertLog(logInput)
                return false
            }

            if (keys?.userKey != keys?.dbUserKey) {
                logInput.message = userKeyIsNotMatch
                await this.insertLog(logInput)
                return false
            }
        }

        const { cycleTime, maxRequests } = options;
        const currentTime = new Date();
        const cycleStart = new Date(currentTime.getTime() - cycleTime * 1000);

        let rateLimit = await this.em?.findOne(RateLimit, { userId });
        if (!rateLimit) {
            rateLimit = new RateLimit();
            rateLimit.userId = userId;
            rateLimit.requestCount = 0;
            rateLimit.lastRequest = currentTime;
            this.em?.persist(rateLimit);
        }

        if (rateLimit.lastRequest < cycleStart) {
            rateLimit.requestCount = 1;
            rateLimit.lastRequest = currentTime;
            await this.em?.flush();
            return true;
        }

        if (rateLimit.requestCount < maxRequests) {
            rateLimit.requestCount++;
            rateLimit.lastRequest = currentTime;
            await this.em?.flush();
            return true;
        }

        logInput.message = userReachMaxRateLimit
        await this.insertLog(logInput)
        return false

    }

    async checkObject(
        obj: any,
        schema: any,
    ): Promise<CheckResult> {
        let result: CheckResult = {
            is_success: false,
        };

        try {
            await schema.validateAsync(obj).then(() => {
                result.is_success = true;
            });
        } catch (error) {
            this.debugger({ function: "checkObject", message: notValidObj, metaData: error })
            result.log = error;
        }

        return result;
    }
}


