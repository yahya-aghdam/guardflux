/**
 * Checks whether a given object is empty.
 * @param object - An object of type Record<string, unknown> (key-value pairs where the keys are strings and the values are of any type).
 * @returns A boolean value - true if the object has no properties, otherwise false.
 */
export function isObjectEmpty(object: Record<string, unknown>): boolean {
    for (const property in object) {
        return false; // If any property is found, the object is not empty
    }
    return true; // If no properties are found, the object is considered empty
}

/**
 * Logs data to the console if the application is in development mode.
 * @param data - The data to be logged (can be of any type, such as a string, number, object, etc.).
 * @param devMode - A boolean flag indicating whether the application is running in development mode.
 * @returns void - This function does not return anything; it only logs the data to the console if devMode is true.
 */
export function devDebugger(data: any, devMode: boolean): void {
    if (devMode) {
        console.log(data); // Log the provided data to the console
        console.log("");   // Print an empty line for better readability in the console output
    }
}
