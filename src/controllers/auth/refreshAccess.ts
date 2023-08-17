import { RequestHandler } from "express";
import { issueAccessTokenById, verifyRefreshToken } from "./tokenHelper.js";
import {
  detatchRefreshToken,
  verifyRefreshTokenExists,
} from "./refreshTokenHelper.js";
import logger from "../../utils/logger.js";

/* Handle re-issue of access token using valid refresh token. */

/**
 * @swagger
 * /api/refresh:
 *  get:
 *   description: Re-issue access token using refresh token. <br/><br/> _Note - the refresh token is expected to be automatically attached to the request by the client browser._
 *   tags: [User Authentication]
 *   responses:
 *    200:
 *     description: Successfully refreshed access token, returns new access token.
 *     content:
 *      application/json:
 *        schema:
 *          type: object
 *          properties:
 *            status:
 *              type: string
 *              example: success
 *            accessToken:
 *                type: string
 *                example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyaWQiOiI2NGRjNzIyYTlkZTc3YzIyODM3Yzg1OGMiLCJpYXQiOjE2OTIxNjg3NDYsImV4cCI6MTY5MjQ2ODc0Nn0.zRHPJSvcNaMdL_YLuWCCzsUczXbA329JVKzMXI13dG8
 */
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
