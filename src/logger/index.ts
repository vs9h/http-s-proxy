import { inspect } from "util";

const loggerTypes = ["DEBUG", "INFO", "ERROR"] as const;
type LoggerType = typeof loggerTypes[number];

const getLogLevel = (type: LoggerType) => loggerTypes.indexOf(type);
const minLogType = process.env.LOG_LEVEL as LoggerType;
const minLogLevel = getLogLevel(minLogType);

class Logger {
    public static log = (type: LoggerType, ...data: unknown[]) => {
        if (getLogLevel(type) < minLogLevel) {
            return;
        }
        if (type == "DEBUG") {
            console.debug("[DEBUG INFO]", ...data);
        } else if (type == "ERROR") {
            console.error("********************\n* UNEXPECTED ERROR *\n"
                +`${JSON.stringify(data)} \n********************`);
        } else {
            console.log(...data);
        }
    };

    public static logStringify: typeof Logger.log = (type, ...data) => {
        Logger.log(type, data.map(value => JSON.stringify(inspect(value))));
    };
}

export const info: typeof console.log = (...data) => Logger.log("INFO", ...data);
export const debug: typeof console.log = (...data) => Logger.log("DEBUG", ...data);
export const error: typeof console.log = (...data) => Logger.log("ERROR", ...data);

export const infoStringify: typeof console.log = (...data) => Logger.logStringify("INFO", ...data);
export const debugStringify: typeof console.log = (...data) => Logger.logStringify("DEBUG", ...data);
export const errorStringify: typeof console.log = (...data) => Logger.logStringify("ERROR", ...data);
