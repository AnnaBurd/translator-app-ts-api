import { RequestHandler } from "express";
import logger from "../utils/logger";
import User from "../models/User";

export const signup: RequestHandler = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    logger.verbose(`Signing up new user: ${name} (${email})`);

    // Validate user input
    const newUser = new User({ name, email, password });
    await newUser.validate();

    console.log(newUser);

    res.status(500).json({ message: "ok" });
  } catch (error) {
    logger.error(`🔥 Could not sign up user (${(error as Error).message})`);
    next(error);
  }
};
