import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import User, { IUser, IUserMethods } from "../models/user";
import logger from "../utils/logger";

const attachJWTCookie = (user: IUser, res: Response): void => {
  const token = jwt.sign(
    { data: user.email },
    process.env.TOKEN_SUPER_SECRET as string,
    { expiresIn: "1d" }
  );

  res.cookie("translator-app-token", token, {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    secure: process.env.NODE_ENV !== "development", // only send with encrypted connection (https)
    httpOnly: true,
  });
};

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
