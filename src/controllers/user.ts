import { RequestHandler } from "express";
import logger from "../utils/logger";
import User from "../models/User";
import { attachJWTToken } from "../middlewares/tokenHandler";

export const signup: RequestHandler = async (req, res, next) => {
  try {
    // Get user input from request
    const { name, email, password } = req.body;
    logger.verbose(`Signing up new user: ${name} (${email})`);

    // Validate user input
    const newUser = new User({ name, email, password });
    await newUser.validate();

    // Save new user into db
    await newUser.save({ validateBeforeSave: false });

    // Generate signed in user token
    attachJWTToken(newUser, res);

    // Send response back to client
    res.status(201).json({
      status: "success",
      data: { name: newUser.name, email: newUser.email },
    });
  } catch (error) {
    logger.error(`🔥 Could not sign up user (${(error as Error).message})`);
    next(error);
  }
};

export const signin: RequestHandler = async (req, res, next) => {
  try {
    // Get user input from request
    const { email, password } = req.body;
    logger.verbose(`Signing in user: ${email}`);

    // Validate user input
    if (!email || !password) {
      throw new Error(`Provide email and password to sign in`);
    }
    const user = await User.findOne({ email });
    if (!user || !(await user.isCorrectPassword(password as string))) {
      throw new Error(`Incorrect user's credentials`);
    }

    // Generate signed in user token
    attachJWTToken(user, res);

    // Send response back to client
    res.status(200).json({
      status: "success",
      data: { name: user.name, email: user.email },
    });
  } catch (error) {
    logger.error(`🔥 Could not sign in user (${(error as Error).message})`);
    next(error);
  }
};
