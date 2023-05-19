/* Usage: Log levels from least (6-Silly) to most (0-Error) important:
  logger.silly("Silly");
  logger.debug("Debug");
  logger.verbose("Verbose");
  logger.http("Http");
  logger.info("Info");
  logger.warn("Warn");
  logger.error("Error"); */

import * as winston from "winston";

const fileLogFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.printf(
    (info) => `${[info.timestamp]} [${info.level}] ${info.message}`
  )
);

const consoleLogFormat = winston.format.combine(
  winston.format.timestamp({
    format: "HH:mm:ss",
  }),
  winston.format.printf((info) => {
    let color;
    switch (info.level) {
      case "silly":
        color = "\x1b[35m"; // magenta
        break;
      case "error":
        color = "\x1b[31m"; // red
        break;
      case "warn":
        color = "\x1b[33m"; // yellow
        break;
      case "info":
        color = "\x1b[36m"; // cyan
        break;
      default:
        color = "\x1b[0m"; // default
    }
    return `${[info.timestamp]} ${color}${info.message}${"\x1b[0m"}`;
  })
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL,
  transports: [
    new winston.transports.Console({
      format: consoleLogFormat,
    }),
    new winston.transports.File({
      filename: "logs/server.log",
      level: process.env.FILE_LOG_LEVEL,
      format: fileLogFormat,
    }),
  ],
});

export default logger;
