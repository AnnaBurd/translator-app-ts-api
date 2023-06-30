import { format, createLogger, transports } from "winston";

/* Log levels from least (6-Silly) to most (0-Error) important:
      logger.silly("Silly");
      logger.debug("Debug");
      logger.verbose("Verbose");
      logger.http("Http");
      logger.info("Info");
      logger.warn("Warn");
      logger.error("Error");
*/

const fileLogFormat = format.combine(
  format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  format.printf((info) => `${[info.timestamp]} [${info.level}] ${info.message}`)
);

const consoleLogFormat = format.combine(
  format.timestamp({
    format: "HH:mm:ss",
  }),
  format.printf((info) => {
    const defaultColor = "\x1b[0m";

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
        color = defaultColor; // default
    }

    return `${[info.timestamp]} ${color}${info.message}${defaultColor}`;
  })
);

const logger = createLogger({
  level: process.env.LOG_LEVEL,
  transports: [
    new transports.Console({
      format: consoleLogFormat,
    }),
    new transports.File({
      filename: "logs/server.log",
      level: process.env.FILE_LOG_LEVEL,
      format: fileLogFormat,
    }),
  ],
});

export default logger;
