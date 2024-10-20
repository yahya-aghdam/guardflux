export type DBT = 'postgresql' | 'mysql' | 'sqlite' | 'mongodb'

export interface RateLimitOptions {
    route: string;
    cycleTime: number;
    maxRequests: number;
}

export interface Keys {
    userKey: string;
    dbUserKey: string;
}

export interface GuradFluxOptions {
    dbName: string;
    logTableName: string;
    rateLimitTableName: string;
}

export interface CheckResult {
    is_success: boolean;
    log?: any;
}

export interface LogInput {
    function: string;
    message: string;
    metaData : any
}
