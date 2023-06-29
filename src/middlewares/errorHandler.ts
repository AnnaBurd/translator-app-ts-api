import { ErrorRequestHandler } from "express";
import logger from "../utils/logger.js";

export class AppError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

// TODO: write meaningful error messages/status codes
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error(`Got to express error handler with error: ${err.message}`, err);

  if (err.name === "TokenExpiredError") {
    return res
      .status(401)
      .json({ error: err, errMessage: "Access token has expired" });
  }

  // if (else)

  // dev mode ->

  // prod mode ->

  // example: email not unique -> ?

  // * Solution resp: have you already registered? We sent you a confirmation email to restore the password.

  // Limit number of sign up attempts per IP.. (recapcha?) TODO:
  //

  res.status(500).json({ error: err, errMessage: err.message });
};
