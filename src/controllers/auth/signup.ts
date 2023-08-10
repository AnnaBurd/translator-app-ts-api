import { RequestHandler } from "express";
import { issueJWTTokens } from "../../middlewares/authTokenHandler.js";
import { attachRefreshToken, saveRefreshToken } from "./refreshTokenHelper.js";
import { sendNotificationOnNewUser } from "../../services/emails/email.js";
import User from "../../models/User.js";
import logger from "../../utils/logger.js";

/* Handle registration of new user accounts, requires new user email (unique) and password. */
export const signup: RequestHandler = async (req, res, next) => {
  try {
    // Get input from request body
    const { firstName, lastName, email, password } = req.body;
    logger.verbose(`Signing up new user: ${firstName} (${email})`);

    // Validate input
    const newUser = new User({ firstName, lastName, email, password });
    await newUser.validate();

    // Generate access and refresh jwt tokens
    const [accessToken, refreshTokenValue] = issueJWTTokens(newUser);

    // Save new user into db and long-lasting refresh token to the database
    await newUser.save({ validateBeforeSave: false });
    await saveRefreshToken(newUser, refreshTokenValue);

    // Notify admin about new user
    sendNotificationOnNewUser(newUser.email);

    // Send response with attached tokens back to user
    attachRefreshToken(refreshTokenValue, res)
      .status(201)
      .json({
        status: "success",
        data: {
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          newUser: true,
        },
        accessToken,
      });
  } catch (error) {
    logger.error(`🔥 Could not sign up user (${(error as Error).message})`);
    next(error);
  }
};
