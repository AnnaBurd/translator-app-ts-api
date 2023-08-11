import { RequestHandler } from "express";
import { issueAccessTokenById, verifyRefreshToken } from "./tokenHelper.js";
import {
  detatchRefreshToken,
  verifyRefreshTokenExists,
} from "./refreshTokenHelper.js";
import logger from "../../utils/logger.js";

/* Handle re-issue of access token using valid refresh token. */
export const refreshAccess: RequestHandler = async (req, res, next) => {
  try {
    // Read data from the attached to the request refresh token cookie (should be attached by the client browser)
    const [currentUserInfo, refreshTokenValue] = await verifyRefreshToken(req);

    // Check that refresh token is still present in the database
    await verifyRefreshTokenExists(currentUserInfo.userid, refreshTokenValue);

    // Re-issue access token
    const accessToken = issueAccessTokenById(currentUserInfo.userid);

    // Sent short-living access token back to user
    res.status(200).json({
      status: "success",
      accessToken,
    });
  } catch (error) {
    logger.error(
      `🔥 Could not re-issue access token. Please sign in again (${
        (error as Error).message
      })`
    );
    detatchRefreshToken(res);
    next(error);
  }
};
