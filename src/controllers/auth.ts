import { Request, Response, NextFunction } from "express";

import User, { IUser, Role as Role } from "../models/User";
import { attachJWTCookie, getJWTValue } from "../utils/jwt-handler";
import logger from "../utils/logger";

declare module "express-serve-static-core" {
  interface Request {
    currentUser?: IUser;
  }
}

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.verbose(`Signing up new user: ${req.body.name} (${req.body.email})`);

  try {
    // Validate user's input
    const newUser = new User(req.body);
    await newUser.validate();

    // Save user to db
    // (and replace passwords with hashes for security)
    await newUser.save({ validateBeforeSave: false });

    // User account was created -> now generate unique token and send it to user
    attachJWTCookie(newUser, res);
    res.status(201).json({ status: "success", data: { id: newUser._id } });
  } catch (error) {
    logger.error(`🔥 Could not sign up user (${(error as Error).message}`);
    res.status(400).json({ status: "failure", error });
  }
};

export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.verbose(`Log in user: ${req.body.email} (${req.body.password})`);

  try {
    // Check if both email and password are provided
    const { email, password } = req.body;

    if (!email || !password) {
      logger.error(`🔥 No email/password, need both to login`);
      res.status(400).json({
        status: "failure",
        error: "No email or password, need both to login",
      });
    }

    // Check if user with such email exists and password is correct
    const user = await User.findOne({ email });

    if (!user || !(await user.isCorrectPassword(password))) {
      logger.error(`🔥 Email or password is incorrect`);
      return res.status(400).json({
        status: "failure",
        error: "Email or password is incorrect",
      });
    }

    // User exists and password is correct -> now generate unique token and send it to user
    attachJWTCookie(user, res);
    logger.verbose(`Log in user: ${req.body.email} successful - sending token`);
    res.status(201).json({ status: "success", data: { id: user._id } });
  } catch (error) {
    logger.error(`🔥 Could not log in user (${(error as Error).message}`);
    res.status(400).json({ status: "failure", error });
  }
};

export const protectRoute = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.verbose(`Protecting route from not logged in users: ${req.url}`);

  // Verify client's token
  // TODO: client can store token as cookie and resend on each request, or I can manually handle it on client side
  // e.g. I can send token with special authorization http headers (headers.authorization Bearer ... token)

  try {
    const clientTokenData = await getJWTValue(req);

    // Check if user, for whom token was issued, still exists
    const currentUser = await User.findOne({ email: clientTokenData.email });
    if (!currentUser)
      return res.status(401).json({
        status: "failure",
        error: "User was deleted, sign up again?",
      });

    // TODO: Check if user did not change password since token was issued

    // Proceed to next (after protected) route middleware
    // And pass the logged in user info inside request data
    req.currentUser = currentUser;
    next();
  } catch (error) {
    logger.error(`🔥 Invalid token (${(error as Error).message}`);
    res.status(401).json({ status: "failure", error });
  }
};

export const restrictRouteTo = (...roles: [Role]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const currentUserRole = req.currentUser?.role as Role;

    // TODO: centralized error handling to remove repetitive code
    if (!roles.includes(currentUserRole)) {
      return res.status(401).json({
        status: "failure",
        error: "You are not autorized",
      });
    }
    next();
  };
};

// TODO: change password / forgot password / confirm email
// TODO: refresh token every x minutes for security?
