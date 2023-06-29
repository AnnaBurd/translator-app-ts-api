import { RequestHandler } from "express";

import logger from "../utils/logger.js";
import User from "../models/User.js";

export const getUserProfile: RequestHandler = async (req, res, next) => {
  logger.verbose(`Getting user info for user with id: ${req.currentUserId}`);

  // TODO: filter user data to output only relevant fields
  const currentUser = await User.findById(req.currentUserId);

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
