import { MikroORM, EntityManager, Options } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MySqlDriver } from '@mikro-orm/mysql';
import { SqliteDriver } from '@mikro-orm/sqlite';
import { MongoDriver } from '@mikro-orm/mongodb';
import { CheckResult, DBT, Keys, RateLimitOptions } from './lib/types';
import { Log, RateLimit } from './lib/entities';
import { dbDefualtName } from './lib/constants';



export default class GuardFlux {
    private orm?: MikroORM;
    private em?: EntityManager;
    private dbUrl: string;
    private dbType: DBT;
    private dbName: string;

    constructor(dbUrl: string, dbType: DBT, dbName: string = dbDefualtName) {

        if (dbUrl == undefined) throw new Error("Database URL is undefined")
        if (dbType == undefined) throw new Error("Database type is undefined")

        this.dbUrl = dbUrl;
        this.dbType = dbType;
        this.dbName = dbName;

        this.initialize()
    }

    private async initialize() {
        const config: Options = {
            dbName: this.dbName,
            clientUrl: this.dbUrl,
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


    private async insertLog(
        message: string,
        metadata?: object
    ): Promise<void> {
        const log = new Log();
        log.message = message;
        log.metadata = metadata ? JSON.stringify(metadata) : undefined;

        this.em?.persist(log);
        await this.em?.flush();
    }

    getEntityManager(): EntityManager | undefined {
        return this.em;
    }

    async close(): Promise<void> {
        if (this.orm) {
            await this.orm.close(true);
        }
    }


    async rateLimit(
        userId: string,
        options: RateLimitOptions,
        checkKey: boolean = false,
        keys: Keys | undefined
    ): Promise<boolean> {

        if (checkKey) {
            if (keys?.userKey == undefined) {
                await this.insertLog(userKeyIsUndefined, { userId, options })
                return false
            }

            if (keys?.dbUserKey == undefined) {
                await this.insertLog(userKeyInDBIsUndefined, { userId, options })
                return false
            }

            if (keys?.dbUserKey == null) {
                await this.insertLog(userKeyInDBIsNull, { userId, options })
                return false
            }

            if (keys?.userKey != keys?.dbUserKey) {
                await this.insertLog(userKeyIsNotMatch, { userId, options })
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

        await this.insertLog(userReachMaxRateLimit, { userId, options })
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
            result.log = error;
        }

        return result;
    }
}


