import { RequestHandler } from "express";
import { issueAccessTokenById, verifyRefreshToken } from "./tokenHelper.js";
import {
  detatchRefreshToken,
  verifyRefreshTokenExists,
} from "./refreshTokenHelper.js";
import User from "../../models/User.js";
import logger from "../../utils/logger.js";

/* Handle issue of access token using valid refresh token, in addition to refreshing value returns signed in user data.  */
export const silentSignIn: RequestHandler = async (req, res, next) => {
  try {
    // Read data from the attached to the request refresh token cookie (should be attached by the client browser)
    const [currentUserInfo, refreshTokenValue] = await verifyRefreshToken(req);

    // Check that refresh token is still present in the database
    await verifyRefreshTokenExists(currentUserInfo.userid, refreshTokenValue);

    // Re-issue access token
    const accessToken = issueAccessTokenById(currentUserInfo.userid);

    // Get signed in user data
    const user = await User.findOne(
      { _id: currentUserInfo.userid, isDeleted: { $ne: true } },
      { email: 1, password: 1, firstName: 1, lastName: 1, role: 1, photoUrl: 1 }
    );

    if (!user) {
      throw new Error("User does not exist");
    }

    // Sent user data and short-living access token back to user
    res.status(200).json({
      status: "success",
      accessToken,
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        photoUrl: user.photoUrl,
      },
    });
  } catch (error) {
    logger.error(
      `🔥 Could not issue access token. Please sign in with credentials (${
        (error as Error).message
      })`
    );
    detatchRefreshToken(res);
    next(error);
  }
};
