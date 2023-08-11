import { RequestHandler } from "express";
import { sendWelcomeEmail } from "../../services/emails/email.js";
import User from "../../models/User.js";
import { AppError, AppErrorName } from "../../middlewares/errorHandler.js";
import logger from "../../utils/logger.js";

/* Manage user account - block/unblock user, add tokens to user account limit */
export const manageUserAccount: RequestHandler = async (req, res, next) => {
  try {
    logger.verbose(
      `Admin ${req.currentUser?.email} is updating user account ${req.params.userEmail}`
    );

    // Get requested updates from request body
    const { isBlocked, planOption: newTokensLimitIncrease } = req.body;

    // Prepare mongodb updates object
    let updates: any = {};

    // Block/unblock user
    if (isBlocked !== undefined) updates.isBlocked = isBlocked;

    // Add tokens to user account limit
    // Note: increaseBy should correspond to the frontend values
    if (newTokensLimitIncrease !== undefined) {
      let increaseBy = 0;
      switch (newTokensLimitIncrease) {
        case "Standart":
          increaseBy = 10000;
          break;
        case "Comfort":
          increaseBy = 100000;
          break;
        case "Premium":
          increaseBy = 1000000;
          break;
      }

      updates = { ...updates, $inc: { tokensLimit: increaseBy } }; // Atomicly increase limit
    }

    // Save changes to database and get back updated values
    const updatedUser = await User.findOneAndUpdate(
      { email: req.params.userEmail },
      updates,
      { fields: { isBlocked: 1, tokensLimit: 1 }, new: true } // Return only updated fields,
    );

    // Make sure update was successful
    if (!updatedUser)
      throw new AppError(
        AppErrorName.ResourceNotFoundError,
        "Trying to update account of not existing user"
      );

    // Welcome users with newly activated accounts - accounts where tokens limits were increased for the first time
    if (
      updatedUser.tokensLimit > 0 &&
      updatedUser.tokensLimit === updates.$inc.tokensLimit &&
      !updatedUser.isBlocked
    )
      sendWelcomeEmail(updatedUser.email);

    // Send updated fields back to client
    res.status(200).json({
      status: "success",
      data: updatedUser,
    });
  } catch (error) {
    logger.error(
      `🔥 Could not update user account: (${(error as Error).message})`
    );
    next(error);
  }
};
