import { PORT, DATABASE_URL } from "./config.js"; // First import should be from config.js to load environment variables

import { connect } from "mongoose";

import app from "./app.js";
import logger from "./utils/logger.js";

// Note: should first establish connection to database and then start the server, because the server depends on the data. However, usually server starts longer, so it is acceptable to launch both in async and thus reduce startup time.

try {
  // Establish database connection
  const db = DATABASE_URL;
  if (!db) throw new Error(`🫣  Specify database url in the .env file`);

  connect(db)
    .then((con) => {
      logger.info("🚀 Established database connection");
    })
    .catch((err) => {
      throw new Error(
        `🔥 Could not connect to the database (${(err as Error).message})`
      );
    });

  // Launch Express server
  const port = (PORT || 8000) as number;

  app.listen(port, (): void => {
    logger.info(`🚀 Listening to requests on port ${port}`);
  });
} catch (err) {
  logger.error(`Could not launch application: ${(err as Error).message}`);
  process.exit(1);
}
