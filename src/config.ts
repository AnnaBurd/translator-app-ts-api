// Load variables from .env file to the node environment
import * as dotenv from "dotenv";
dotenv.config();

// Export variables to be used in the application
export const NODE_ENV = process.env.NODE_ENV;
export const PORT = process.env.PORT;

export const CLIENT_URL = process.env.CLIENT_URL;

export const DATABASE_URL = process.env.DATABASE_URL;

export const EMAIL_ID = process.env.EMAIL_ID;
export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;
export const NOTIFICATIONS_EMAIL = process.env.NOTIFICATIONS_EMAIL;

export const AI_KEY = process.env.AI_KEY;

export const REFRESH_TOKEN_TOP_SECRET = process.env.REFRESH_TOKEN_TOP_SECRET;
export const ACCESS_TOKEN_TOP_SECRET = process.env.ACCESS_TOKEN_TOP_SECRET;
export const REFRESH_TOKEN_NAME = process.env.REFRESH_TOKEN_NAME;
export const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN;
export const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN;

export const LOG_LEVEL = process.env.LOG_LEVEL;
export const FILE_LOG_LEVEL = process.env.FILE_LOG_LEVEL;
export const FILE_LOG_PATH = process.env.FILE_LOG_PATH;

export const rawData =
  process.env.RAW_SAMPLES_PATH || "./data/sample_translation_data.csv";
export const sampleData =
  process.env.VERIFIED_SAMPLES_PATH ||
  "./data/sample_translation_data_checked.csv";
export const storePath =
  process.env.VECTOR_DATA_STORE_PATH || "./data/vector_store_local";

export const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME;
export const STORAGE_CONNECTION_STRING = process.env.STORAGE_CONNECTION_STRING;
export const STORAGE_CONTAINER_NAME = process.env.STORAGE_CONTAINER_NAME;

// console.log("Loaded environment variables: ");
// console.log("NODE_ENV: ", NODE_ENV);
// console.log("PORT: ", PORT);
// console.log("CLIENT_URL: ", CLIENT_URL);
// console.log("DATABASE_URL: ", DATABASE_URL);
// console.log("EMAIL_ID: ", EMAIL_ID);
// console.log("EMAIL_PASSWORD: ", EMAIL_PASSWORD);
// console.log("NOTIFICATIONS_EMAIL: ", NOTIFICATIONS_EMAIL);
// console.log("AI_KEY: ", AI_KEY);
// console.log("REFRESH_TOKEN_TOP_SECRET: ", REFRESH_TOKEN_TOP_SECRET);
// console.log("ACCESS_TOKEN_TOP_SECRET: ", ACCESS_TOKEN_TOP_SECRET);
// console.log("REFRESH_TOKEN_NAME: ", REFRESH_TOKEN_NAME);
// console.log("REFRESH_TOKEN_EXPIRES_IN: ", REFRESH_TOKEN_EXPIRES_IN);
// console.log("ACCESS_TOKEN_EXPIRES_IN: ", ACCESS_TOKEN_EXPIRES_IN);
// console.log("LOG_LEVEL: ", LOG_LEVEL);
// console.log("FILE_LOG_LEVEL: ", FILE_LOG_LEVEL);
// console.log("FILE_LOG_PATH: ", FILE_LOG_PATH);
