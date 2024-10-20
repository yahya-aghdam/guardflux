import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/core';
import { logTableName, rateLimitTableName } from './constants';


@Entity({ tableName: logTableName })
export class Log {
    @PrimaryKey()
    id!: number;

    @Property()
    message!: string;

    @Property({ nullable: true })
    metadata?: string;

    @Property()
    timestamp: Date = new Date(); 
}

@Entity({ tableName: rateLimitTableName })
export class RateLimit {
    @PrimaryKey()
    id!: number;

    @Index()
    @Property()
    userId!: string; // Or IP address / API key

    @Property()
    requestCount: number = 0;

    @Property()
    lastRequest: Date = new Date();
}
