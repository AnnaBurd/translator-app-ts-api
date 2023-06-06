import { RequestHandler } from "express";
import { HydratedDocument } from "mongoose";
import User, { IUser, Role } from "../models/User";
import { readJWTTokenValue } from "./tokenHandler";
import logger from "../utils/logger";

// TODO: change password / forgot password / confirm email
// TODO: refresh token every x minutes for security?

// Globally extend Express TS Request interface with "currentUser" property
declare module "express-serve-static-core" {
  interface Request {
    currentUser?: HydratedDocument<IUser>;
  }
}

/* Require users to authenticate to access api */
export const protectRoute: RequestHandler = async (req, res, next) => {
  logger.verbose(`Protecting route ${req.url} from not authenticated users`);

  try {
    const currentUserInfo = await readJWTTokenValue(req);

    const currentUser = await User.findOne({ email: currentUserInfo.email });

    if (!currentUser) {
      throw new Error("No Such User Exists");
    }

    // TODO: Check if user did not change password since token was issued

    // Pass current user to next middlewares
    req.currentUser = currentUser;
    next();
  } catch (error) {
    logger.error(`Could not authenticate user to route ${req.url}: ${error}`);
    next(error);
  }
};

/* Restrict API usage to users with specific Roles, e.g. only for Role.Admin */
export const restrictRouteTo = (...roles: Role[]) => {
  const restrictRoute: RequestHandler = async (req, res, next) => {
    logger.verbose(
      `Protecting route ${req.url} from not authorized users: ${req.currentUser?.email}`
    );

    try {
      const currentUser = req.currentUser!;

      if (!roles.includes(currentUser.role))
        throw new Error("You are not autorized");

      next();
    } catch (error) {
      next(error);
    }
  };

  return restrictRoute;
};
