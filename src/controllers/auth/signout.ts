import { RequestHandler } from "express";
import { verifyRefreshToken } from "./tokenHelper.js";
import { detatchRefreshToken } from "./refreshTokenHelper.js";
import RefreshToken from "../../models/RefreshToken.js";
import logger from "../../utils/logger.js";

/* Handle user signout (logout).

IMPORTANT: should also delete access token on client side 
*/
/* Handle sign in of existing users, requires email and password. */
/**
 * @swagger
 * /api/users/signout:
 *  post:
 *   description: Sign out user. <br/><br/> _Note - the refresh token is removed by the browser, but **access token is expected to be removed with client-side code**._
 *   tags: [User Authentication]
 *   responses:
 *    204:
 *     description: Successful sign out, returns success message.
 *     content:
 *      application/json:
 *        schema:
 *          type: object
 *          properties:
 *            status:
 *              type: string
 *              example: success
 *            message:
 *              type: string
 *              example: logout
 */
export const signout: RequestHandler = async (req, res, next) => {
  try {
    // Verify refresh token
    const [currentUserInfo, refreshTokenValue] = await verifyRefreshToken(req);

    // Delete refresh token from the database
    await RefreshToken.findOneAndRemove({
      user: currentUserInfo.userid,
      value: refreshTokenValue,
    });

    // Inform browser on client side that refresh token cookie should be deleted
    detatchRefreshToken(res);

    // Send back empty response
    res.status(204).json({
      status: "success",
      message: "logout",
    });
  } catch (error) {
    logger.error(`🔥 Could not log out (${(error as Error).message})`);
    next(error);
  }
};
