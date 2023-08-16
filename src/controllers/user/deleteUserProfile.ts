import { RequestHandler } from "express";
import User from "../../models/User.js";
import { AppError, AppErrorName } from "../../middlewares/errorHandler.js";
import logger from "../../utils/logger.js";
import RefreshToken from "../../models/RefreshToken.js";
import { detatchRefreshToken } from "../auth/auth.js";

/* Handle user deleting own profile 
Note: this is a soft delete, user data is not removed from the database, but isDeleted flag is set to true
*/
/**
 * @swagger
 * /api/users/profile:
 *  delete:
 *   description: Soft delete of the user profile.
 *   tags: [User Profile]
 *   security:
 *   - bearerAuth: []
 *   requestBody:
 *    required: true
 *    content:
 *      application/json:
 *       schema:
 *        type: object
 *        properties:
 *         confirmDelete:
 *          type: boolean
 *          example: true
 *   responses:
 *    204:
 *     description: Successfully deleted user account data.
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
 *              example: deleted
 */
export const deleteUserProfile: RequestHandler = async (req, res, next) => {
  try {
    logger.verbose(`User ${req.currentUserId} is deleting their profile`);

    const { confirmDelete } = req.body;

    if (!confirmDelete)
      throw new AppError(
        AppErrorName.ValidationError,
        "Could not delete user profile. User is required to confirm that they want their profile to be deleted by providing confirmDelete: true in the request body"
      );

    // Get current user data (email address)
    const currentUser = await User.findById(req.currentUserId, { email: 1 });

    if (!currentUser)
      throw new AppError(
        AppErrorName.AppError,
        "Could not delete user profile. User not found"
      );

    // Apply changes to user profile
    // TODO: can use mongo functionality to update email without having to fetch it first
    await User.updateOne(
      { _id: req.currentUserId },
      {
        isDeleted: true,
        email: `${currentUser.email}-deleted-${Date.now().toString()}`,
      }
    );

    // Delete all tokens previously issued to user
    await RefreshToken.deleteMany({ owner: req.currentUserId });

    // Inform browser on client side that refresh token cookie should be deleted
    // Note: short-living access token is still active, client side is expected to delete it
    detatchRefreshToken(res);

    // Send response back to client
    res.status(204).json({ status: "success", message: "deleted" });
  } catch (error) {
    next(error);
  }
};
