import * as dotenv from "dotenv";
// Load environment variables and secrets
// (by default reads constants from .env file and saves them as node js environment variables)
dotenv.config();

import { connect as databaseConnect } from "mongoose";
import app from "./app";
import logger from "./utils/logger";

// Connect to database
const DATABASE_URL =
  process.env.NODE_ENV === "development"
    ? (process.env.DATABASE_URL as string)
    : "TODO: prod url";

databaseConnect(DATABASE_URL)
  .then((con) => {
    logger.info("🚀 Connected to database");
  })
  .catch((err) => {
    console.error("🔥 Could not connect to the database, exiting app ", err);
    process.exit(1);
  });

// Launch express app
const PORT: number = (
  process.env.NODE_ENV === "development"
    ? process.env.PORT || 8765
    : process.env.PROD_PORT
) as number;

app.listen(PORT, (): void => {
  logger.info(`🚀 Launched Express App, port ${PORT}`);
});

// TODO: Remove later
// // Gracefully shut down the server in case something goes wrong
// process.on("uncaughtException", (err) => {
//   console.error("🔥 UncaughtException, exiting app ", err);
//   process.exit(1);
// });

// // Gracefully shut down the server in case something goes wrong with async code
// process.on("unhandledRejection", (err) => {
//   console.error("🔥 UnhandledRejection, exiting app ", err);
//   server.close(() => {
//     process.exit(1);
//   });
// });
