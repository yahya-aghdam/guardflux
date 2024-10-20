import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/core';
import { logTableName, rateLimitTableName } from './constants';
import { randomUUID } from 'crypto';


@Entity({ tableName: logTableName })
export class Log {
    @PrimaryKey()
    id: string = randomUUID();

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
    id: string = randomUUID();

    @Index()
    @Property()
    userId!: string; // Or IP address / API key

    @Property()
    requestCount: number = 0;

    @Property()
    lastRequest: Date = new Date();
}
