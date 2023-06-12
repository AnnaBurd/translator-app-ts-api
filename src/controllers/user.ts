import { RequestHandler } from "express";
import { attachJWTToken } from "../middlewares/tokenHandler";
import logger from "../utils/logger";
import User from "../models/User";

export const signup: RequestHandler = async (req, res, next) => {
  try {
    // Get user input from request
    const { firstName, lastName, email, password } = req.body;
    logger.verbose(`Signing up new user: ${firstName} (${email})`);

    // Validate user input
    const newUser = new User({ firstName, lastName, email, password });
    await newUser.validate();

    // Save new user into db
    await newUser.save({ validateBeforeSave: false });

    // Generate token for signed in user
    attachJWTToken(newUser, res);

    // Send response back to user
    res.status(201).json({
      status: "success",
      data: {
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
      },
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
      data: { name: user.firstName, email: user.email },
    });
  } catch (error) {
    logger.error(`🔥 Could not sign in user (${(error as Error).message})`);
    next(error);
  }
};

export const getUserProfile: RequestHandler = async (req, res, next) => {
  logger.verbose(`Getting user info for user: ${req.currentUser?.email}`);

  // TODO: filter user data to output only relevant fields

  // Send response back to client
  res.status(200).json({
    status: "success",
    data: { user: req.currentUser },
  });
};

export const getAllUsersStats: RequestHandler = async (req, res, next) => {
  logger.verbose(`Getting all users info for admin: ${req.currentUser?.email}`);

  // TODO: filter user data to output only relevant fields

  try {
    const users = await User.find();

    // TODO: paginate results

    res.status(200).json({ status: "success", data: users });
  } catch (error) {
    logger.error(`🔥 Could not get users data (${(error as Error).message})`);
    next(error);
  }
};
