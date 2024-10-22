export type DBType = 'postgresql' | 'mysql' | 'mongodb'

export interface DbConfig {
    dbName?: string;
    dbType: DBType;
    dbURI: string;
    dbDebug: boolean;
}

export interface RateLimitOptions {
    route: string;
    cycleTime: number;
    maxRequests: number;
}

export interface CheckResult {
    isValid: boolean;
    log?: any;
}

