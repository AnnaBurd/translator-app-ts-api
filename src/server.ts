import { PORT, DATABASE_URL } from "./config.js";

import { connect } from "mongoose";

import app from "./app.js";
import logger from "./utils/logger.js";

try {
  // Establish database connection
  const db = DATABASE_URL;
  if (!db) throw new Error(`🫣  Need to specify database url in the .env file`);

  connect(db)
    .then((con) => {
      logger.info("🚀 Connected to database");
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
