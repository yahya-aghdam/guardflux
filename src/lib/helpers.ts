

export function isObjectEmpty(object: Record<string, unknown>): boolean {
    for (const property in object) {
        return false;
    }
    return true;
}

export function devDebugger(data: any, devMode: boolean): void {
    if (devMode) {
        console.log(data)
        console.log("")
    }
}
