import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/core';
import { rateLimitTableName } from './constants';
import { randomUUID } from 'crypto';


@Entity({ tableName: rateLimitTableName })
export class RateLimit {
    @PrimaryKey()
    _id: string = randomUUID();

    @Index()
    @Property()
    userId!: string; // Or IP address / API key

    @Property()
    route!: string;

    @Property()
    requestCount: number = 0;

    @Property()
    lastRequest: Date = new Date();
}
