import { RequestHandler } from "express";
import { verifyRefreshToken } from "../../middlewares/authTokenHandler.js";
import { detatchRefreshToken } from "./refreshTokenHelper.js";
import RefreshToken from "../../models/RefreshToken.js";
import logger from "../../utils/logger.js";

/* Handle user signout (logout).

IMPORTANT: should also delete access token on client side 
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
