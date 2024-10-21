import { LogInput } from "./types";

export function isObjectEmpty(object: Record<string, unknown>): boolean {
    for (const property in object) {
        return false;
    }
    return true;
}

export function localDebugger(data: LogInput, debug: boolean): void {
    if (debug) {
        console.log(`Function: ${data.function}`)
        console.log(`Message: ${data.message}`)
        console.log(`Meta data: ${data.metaData}`)
        console.log("")
    }
}