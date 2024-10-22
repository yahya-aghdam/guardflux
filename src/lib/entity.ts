import { Entity, PrimaryKey, Property, Index } from '@mikro-orm/core';
import { rateLimitTableName } from './constants';
import { randomUUID } from 'crypto';


// Define the RateLimit entity class with MikroORM annotations
@Entity({ tableName: rateLimitTableName }) // This decorator specifies that the class is an entity with a custom table name
export class RateLimit {

    @PrimaryKey() // Marks this field as the primary key for the entity
    _id: string = randomUUID(); // Automatically generates a unique ID for each record using UUID

    @Index() // Creates an index for this property, which improves query performance when searching by userId
    @Property() // Marks this as a column in the database
    userId!: string; // Represents the user identifier, which could also be an IP address or API key

    @Property() // Marks this as a column in the database
    route!: string; // The specific API route being accessed

    @Property() // Marks this as a column in the database
    requestCount: number = 0; // Tracks the number of requests made by the user to this route

    @Property() // Marks this as a column in the database
    lastRequest: Date = new Date(); // Records the timestamp of the last request made
}
