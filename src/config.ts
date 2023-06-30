// Load variables from .env file to the node environment
import * as dotenv from "dotenv";
dotenv.config();

export const AI_KEY = process.env.AI_KEY;
export const PORT = process.env.PORT;
export const DATABASE_URL = process.env.DATABASE_URL;
