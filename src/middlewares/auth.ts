import { RequestHandler } from "express";
import { Role } from "../models/User";
import logger from "../utils/logger";

export const protectRoute: RequestHandler = async (req, res, next) => {
  logger.verbose(`Protecting route ${req.url} from not authenticated users`);

  next();
};

export const restrictRouteTo = (...roles: Role[]) => {
  const restrictRoute: RequestHandler = async (req, res, next) => {
    logger.verbose(`Protecting route ${req.url} from not authorized users`);

    next();
  };

  return restrictRoute;
};
