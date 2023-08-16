import { ErrorRequestHandler } from "express";
import logger from "../utils/logger.js";

export enum AppErrorName {
  AppError = "AppError",
  ValidationError = "ValidationError",
  DatabaseError = "DatabaseError",
  AuthenticationError = "AuthenticationError",
  TokenExpiredError = "TokenExpiredError",
  ApiError = "ApiError",
  ResourceNotFoundError = "ResourceNotFoundError",
  RunOutOfTokens = "RunOutOfTokens",
  BlockedUsage = "BlockedUsage",
  NotActivatedAccount = "NotActivatedAccount",
}

export class AppError extends Error {
  constructor(public name = AppErrorName.AppError, message: string) {
    super(message);
  }
}

// TODO: write meaningful error messages/status codes
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error(`🏸 Got to express errorHandler: ${err.name} - ${err.message}`);
  console.log(err);

  switch (err.name) {
    case AppErrorName.ResourceNotFoundError:
      return res.status(404).json({ error: err, errMessage: err.message });
    case AppErrorName.TokenExpiredError:
      return res
        .status(401)
        .json({ error: err, errMessage: "Access token has expired" });
    case AppErrorName.ApiError:
      return res
        .status(400)
        .json({ error: err, errMessage: "Could not fetch translation" });
    case AppErrorName.ValidationError:
      return res.status(400).json({ error: err, errMessage: err.message });
    case AppErrorName.RunOutOfTokens:
      return res.status(402).json({ error: err, errMessage: err.message });
    case AppErrorName.BlockedUsage:
      return res.status(403).json({ error: err, errMessage: err.message });
    case AppErrorName.NotActivatedAccount:
      return res.status(426).json({ error: err, errMessage: err.message });
    default:
      return res.status(500).json({ error: err, errMessage: err.message });
  }

  // TODO:
  // dev mode ->

  // prod mode ->

  // example: email not unique -> ?

  // * Solution resp: have you already registered? We sent you a confirmation email to restore the password.

  // Limit number of sign up attempts per IP.. (recapcha?) TODO:
  //
};

// TODO: fix all data and error messages that application returns - make sure that no sensitive data slips out

// TODO: tab through all pages and make sure that all outlines are in similar style

// TODO: allow to store documents in local storage (ask for permission in upload form
