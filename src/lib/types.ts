// Define a type alias for supported database types.
// This type can only take one of the specified string values.
export type DBType = 'postgresql' | 'mysql' | 'mongodb';

/**
 * Interface representing the database configuration options.
 */
export interface DbConfig {
    dbName?: string;  // Optional name of the database. If not provided, default name is "guardflux".
    dbType: DBType;   // Required field to specify the type of database being used (e.g., PostgreSQL, MySQL, MongoDB).
    dbURI: string;    // The connection URI for the database.
    dbDebug: boolean; // Flag to enable or disable debugging output during database operations.
}

/**
 * Interface defining options for rate limiting.
 */
export interface RateLimitOptions {
    route: string;       // The API route for which rate limiting is being applied.
    cycleTime: number;   // Time period (in seconds) for which the rate limit applies.
    maxRequests: number; // Maximum number of requests allowed within the cycle time.
}

/**
 * Interface representing the result of a check operation.
 */
export interface CheckResult {
    isValid: boolean; // Indicates whether the validation was successful (true) or failed (false).
    log?: any;        // Optional property to log additional information or errors related to the validation process.
}
