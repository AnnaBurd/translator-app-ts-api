import { RequestHandler } from "express";
import User from "../../models/User.js";
import { AppError, AppErrorName } from "../../middlewares/errorHandler.js";
import logger from "../../utils/logger.js";

/* Return data about user profile without usage statistics */

/**
 * @swagger
 * /api/users/profile/details:
 *  get:
 *   description: Get data about signed in user profile.
 *   tags: [User Profile]
 *   security:
 *   - bearerAuth: []
 *   responses:
 *    200:
 *     description: Successfully verified user access token and got user profile data.
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
 *                user:
 *                  type: object
 *                  properties:
 *                    email:
 *                      type: string
 *                      example: example@mail.com
 *                      format: email
 *                    registrationDate:
 *                      type: string
 *                      example: 2020-10-30T12:00:00.000Z
 */
export const getUserProfileDetails: RequestHandler = async (req, res, next) => {
  try {
    logger.verbose(
      `Getting user profile details for signed in user: ${req.currentUserId}`
    );

    const currentUser = await User.findById(req.currentUserId, {
      registrationDate: 1,
      email: 1,
      _id: 0,
    });

    if (!currentUser)
      throw new AppError(
        AppErrorName.AuthenticationError,
        "Could not get data for user profile. User not found."
      );

    // Send response back to client
    res.status(200).json({
      status: "success",
      data: { user: currentUser },
    });
  } catch (error) {
    next(error);
  }
};
