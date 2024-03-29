import morgan from "morgan";

import logger from "./logger.js";

export default morgan(
  ":remote-addr :method :url -> :status - :response-time ms",
  { stream: { write: (message: String) => logger.http(message.trim()) } }
);
