import { getDriver, schema, checkObject, rateLimit } from './index';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { MySqlDriver } from '@mikro-orm/mysql';
import { MongoDriver } from '@mikro-orm/mongodb';
import { CheckResult, RateLimitOptions, DbConfig } from './lib/types';
import { MikroORM } from '@mikro-orm/core';
import { RateLimit as RateLimitEntity } from './lib/entity';
import Joi = require('joi');

describe('getDriver', () => {
    it('should return PostgreSqlDriver for postgresql', () => {
        expect(getDriver('postgresql')).toBe(PostgreSqlDriver);
    });

    it('should return MySqlDriver for mysql', () => {
        expect(getDriver('mysql')).toBe(MySqlDriver);
    });

    it('should return MongoDriver for mongodb', () => {
        expect(getDriver('mongodb')).toBe(MongoDriver);
    });

    it('should throw an error for unsupported database type', () => {
        expect(() => getDriver('unsupported' as any)).toThrow('Unsupported database type');
    });
});

describe('checkObject', () => {
    const testSchema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().required()
    });

    it('should return invalid result for empty object', async () => {
        const result = await checkObject({}, testSchema);
        expect(result.isValid).toBe(false);
        expect(result.log).toBeDefined();
    });

    it('should return valid result for valid object', async () => {
        const result = await checkObject({ name: 'John', age: 30 }, testSchema);
        expect(result.isValid).toBe(true);
    });

    it('should return invalid result for invalid object', async () => {
        const result = await checkObject({ name: 'John' }, testSchema);
        expect(result.isValid).toBe(false);
        expect(result.log).toBeDefined();
    });
});

describe('rateLimit', () => {
    const mockDbConfig: DbConfig = {
        dbName: 'testDb',
        dbURI: 'mongodb://localhost:27017',
        dbType: 'mongodb',
        dbDebug: false
    };

    const mockOptions: RateLimitOptions = {
        route: '/test',
        maxRequests: 5,
        cycleTime: 60
    };

    beforeAll(async () => {
        const orm = await MikroORM.init({
            dbName: mockDbConfig.dbName,
            clientUrl: mockDbConfig.dbURI,
            entities: [RateLimitEntity],
            driver: getDriver(mockDbConfig.dbType) as any,
            allowGlobalContext: true
        });
        await orm.getSchemaGenerator().dropSchema();
        await orm.getSchemaGenerator().createSchema();
    });

    it('should create a new rate limit record if none exists', async () => {
        const result = await rateLimit('user1', mockOptions, mockDbConfig);
        expect(result.isValid).toBe(true);
    });

    it('should reset request count if last request is older than cycle start', async () => {
        const result = await rateLimit('user2', mockOptions, mockDbConfig);
        expect(result.isValid).toBe(true);
    });

    it('should increment request count if below max requests', async () => {
        await rateLimit('user3', mockOptions, mockDbConfig);
        const result = await rateLimit('user3', mockOptions, mockDbConfig);
        expect(result.isValid).toBe(true);
    });

    it('should return invalid result if max requests are exceeded', async () => {
        for (let i = 0; i < mockOptions.maxRequests; i++) {
            await rateLimit('user4', mockOptions, mockDbConfig);
        }
        const result = await rateLimit('user4', mockOptions, mockDbConfig);
        expect(result.isValid).toBe(false);
        expect(result.log).toBeDefined();
    });
});