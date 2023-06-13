import { RequestHandler } from "express";

import logger from "../utils/logger";
import User from "../models/User";

export const getUserProfile: RequestHandler = async (req, res, next) => {
  logger.verbose(`Getting user info for user: ${req.currentUser?.email}`);

  // TODO: filter user data to output only relevant fields
  const currentUser = await User.findOne({ email: req.currentUser!.email });

  // Send response back to client
  res.status(200).json({
    status: "success",
    data: { user: currentUser },
  });
};

// TODO: refactor
export const getAllUsersStats: RequestHandler = async (req, res, next) => {
  logger.verbose(
    `Getting all users info (required by admin): ${req.currentUser?.email}`
  );

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
