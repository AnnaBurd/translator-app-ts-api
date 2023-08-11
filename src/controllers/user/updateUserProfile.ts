import { RequestHandler } from "express";
import User from "../../models/User.js";
import { AppError, AppErrorName } from "../../middlewares/errorHandler.js";
import logger from "../../utils/logger.js";
import { removeUploadedFile } from "../../services/filestorage/filestorage.js";

export const updateUserProfile: RequestHandler = async (req, res, next) => {
  try {
    logger.verbose(
      `Updating user profile for signed in user: ${req.currentUserId}`
    );

    // Get user input from the request body
    const { firstName, lastName, newEmail, currentPassword, newPassword } =
      req.body;

    const photo = req.file; // blob object - handled by multer middleware

    // Get current user data
    const currentUser = await User.findById(req.currentUserId);
    if (!currentUser)
      throw new AppError(AppErrorName.AuthenticationError, "User not found");

    // Update name
    if (firstName) currentUser.firstName = firstName;
    if (lastName) currentUser.lastName = lastName;

    // Update email, not-unique emails are not accepted by the database
    if (newEmail) currentUser.email = newEmail;

    // Update user password, but first check if current password is provided and correct
    if (currentPassword && newPassword) {
      const currentPasswordValid = await currentUser.isCorrectPassword(
        currentPassword
      );
      if (!currentPasswordValid)
        throw new AppError(
          AppErrorName.AuthenticationError,
          "Could not update password, current password is incorrect"
        );
      currentUser.password = newPassword; // password is hashed in the pre save mongoose middleware
    }

    // Update user profile photo url
    if (photo) {
      // Delete previous profile photo to free up space
      const previousPhotoUrl = currentUser.photoUrl;
      if (previousPhotoUrl) removeUploadedFile(`./public${previousPhotoUrl}`);

      // Save new photo url (path is already generated by multer middleware)
      currentUser.photoUrl = photo.path.split("public")[1];
    }

    // Apply all changes
    await currentUser.save();

    // Send response back to client
    res.status(200).json({
      status: "success",
      data: {
        user: {
          email: currentUser.email,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          photoUrl: currentUser.photoUrl,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
