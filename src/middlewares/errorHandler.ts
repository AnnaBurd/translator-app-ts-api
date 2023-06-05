import { ErrorRequestHandler } from "express";
import logger from "../utils/logger";

export class AppError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error(`Got to express error handler with error: ${err.message}`);
  res.status(500).json({ error: err, errMessage: err.message });
};
