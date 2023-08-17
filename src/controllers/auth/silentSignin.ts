import { RequestHandler } from "express";
import { issueAccessTokenById, verifyRefreshToken } from "./tokenHelper.js";
import {
  detatchRefreshToken,
  verifyRefreshTokenExists,
} from "./refreshTokenHelper.js";
import User from "../../models/User.js";
import logger from "../../utils/logger.js";

/* Handle issue of access token using valid refresh token, in addition to refreshing value returns signed in user data.  */
/**
 * @swagger
 * /api/refresh/signin:
 *  get:
 *   description: Refresh access token using valid refresh token, in addition to refreshing value returns signed in user data.
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
 *            data:
 *              type: object
 *              properties:
 *                firstName:
 *                  type: string
 *                  example: Professor
 *                lastName:
 *                  type: string
 *                  example: Limibus
 *                email:
 *                  type: string
 *                  example: example@mail.com
 *                role:
 *                  type: string
 *                  example: User
 *                photoUrl:
 *                  type: string
 *                  example: https://translatorappstorage.blob.core.windows.net/uploads/1692088832803-ai_generated___old_man_jenkins_by_edmodo21_dfhjs8s-pre.jpg
 *            accessToken:
 *                type: string
 *                example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyaWQiOiI2NGRjNzIyYTlkZTc3YzIyODM3Yzg1OGMiLCJpYXQiOjE2OTIxNjg3NDYsImV4cCI6MTY5MjQ2ODc0Nn0.zRHPJSvcNaMdL_YLuWCCzsUczXbA329JVKzMXI13dG8
 */
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
