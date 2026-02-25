// src/server/logger.ts
import winston from 'winston';
import { LogLevel } from '../../shared/logger.ts';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || LogLevel.DEBUG,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `[${timestamp}] ${level}: ${message} ${metaString}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ],
});

export default logger;
