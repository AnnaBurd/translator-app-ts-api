import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

import User, { IUser } from "../models/user";
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
    newUser.password = await bcrypt.hash(newUser.password, 12);
    await newUser.save({ validateBeforeSave: false });

    // User account was created -> now generate unique token and send it to user
    attachJWTCookie(newUser, res);
    res.status(201).json({ status: "success", data: { id: newUser._id } });
  } catch (error) {
    logger.error(`🔥 Could not sign up user (${(error as Error).message}`);
    res.status(400).json({ status: "failure", error });
  }
};
