import { RequestHandler } from "express";
import User, { IUser, Role } from "../models/User.js";
import { verifyAccessToken } from "./authTokenHandler.js";
import logger from "../utils/logger.js";

// TODO: change password / forgot password / confirm email

// Globally extend Express TS Request interface with "currentUser" property
declare module "express-serve-static-core" {
  interface Request {
    currentUserId?: string;
    currentUser?: IUser;
  }
}

/* Require users to authenticate to access api */
export const protectRoute: RequestHandler = async (req, _res, next) => {
  logger.verbose(`Protecting route ${req.url} from not authenticated users`);

  try {
    const currentUserInfo = await verifyAccessToken(req);

    // Pass current user info to next middlewares
    req.currentUserId = currentUserInfo.userid;
    next();
  } catch (error) {
    logger.error(`Could not authenticate user to route ${req.url}: ${error}`);
    next(error);
  }
};

/* Restrict API usage to users with specific Roles, e.g. only for Role.Admin */
export const restrictRouteTo = (...roles: Role[]) => {
  const restrictRoute: RequestHandler = async (req, _res, next) => {
    logger.verbose(
      `Protecting route ${req.url} from not authorized users: ${req.currentUser?.email}`
    );

    try {
      // Get from the database authorization role of the currently signed in user
      const currentUser = await User.findById(req.currentUserId);

      if (
        !currentUser ||
        !currentUser.role ||
        !roles.includes(currentUser.role)
      )
        throw new Error("You are not autorized");

      // Pass current user to next middlewares
      req.currentUser = currentUser;

      next();
    } catch (error) {
      next(error);
    }
  };

  return restrictRoute;
};
