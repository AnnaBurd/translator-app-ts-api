// Load variables from .env file to the node environment
import * as dotenv from "dotenv";
dotenv.config();

export const AI_KEY = process.env.AI_KEY;
export const PORT = process.env.PORT;
export const DATABASE_URL = process.env.DATABASE_URL;

// export const CLIENT_URL = process.env.CLIENT_URL;
export const CLIENT_URL = "http://192.168.1.8:5173";

export const EMAIL_ID = process.env.EMAIL_ID;
export const EMAIL_PASSWORD = process.env.EMAIL_PASSWORD;

export const NOTIFICATIONS_EMAIL = process.env.NOTIFICATIONS_EMAIL;
