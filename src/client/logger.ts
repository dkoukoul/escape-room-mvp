// src/client/logger.ts
import { LogLevel, type Logger } from '../../shared/logger.ts';

const LOG_LEVELS: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

const currentLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || (import.meta.env.DEV ? LogLevel.DEBUG : LogLevel.INFO);

const shouldLog = (level: LogLevel) => LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];

export const logger: Logger = {
  debug: (message: string, ...meta: any[]) => {
    if (shouldLog(LogLevel.DEBUG)) {
      console.debug(`[DEBUG] ${message}`, ...meta);
    }
  },
  info: (message: string, ...meta: any[]) => {
    if (shouldLog(LogLevel.INFO)) {
      console.info(`[INFO] ${message}`, ...meta);
    }
  },
  warn: (message: string, ...meta: any[]) => {
    if (shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] ${message}`, ...meta);
    }
  },
  error: (message: string, ...meta: any[]) => {
    if (shouldLog(LogLevel.ERROR)) {
      console.error(`[ERROR] ${message}`, ...meta);
    }
  },
};

export default logger;
