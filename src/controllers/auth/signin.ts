import { RequestHandler } from "express";
import { issueJWTTokens } from "./tokenHelper.js";
import { attachRefreshToken, saveRefreshToken } from "./refreshTokenHelper.js";
import User from "../../models/User.js";
import logger from "../../utils/logger.js";

/* Handle sign in of existing users, requires email and password. */
export const signin: RequestHandler = async (req, res, next) => {
  try {
    // Get input from request body
    const { email, password } = req.body;
    logger.verbose(`Signing in user: ${email}`);

    // Validate input
    if (!email || !password) {
      throw new Error(`Provide email and password to sign in`);
    }

    // Find user in the database
    const user = await User.findOne(
      { email, isDeleted: { $ne: true } },
      { email: 1, password: 1, firstName: 1, lastName: 1, role: 1, photoUrl: 1 }
    );

    // Check if user exists and password is correct
    if (!user || !(await user.isCorrectPassword(password as string))) {
      throw new Error(`Incorrect user's credentials`);
    }

    // Generate new refresh and access tokens
    const [accessToken, refreshTokenValue] = issueJWTTokens(user);

    // Save new refresh token to the database
    await saveRefreshToken(user, refreshTokenValue);

    // Send response with attached tokens back to user
    attachRefreshToken(refreshTokenValue, res)
      .status(200)
      .json({
        status: "success",
        data: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          photoUrl: user.photoUrl,
        },
        accessToken,
      });
  } catch (error) {
    logger.error(`🔥 Could not sign in user (${(error as Error).message})`);
    next(error);
  }
};
