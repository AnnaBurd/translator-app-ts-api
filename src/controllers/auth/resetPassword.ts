import crypto from "crypto";
import bcrypt from "bcrypt";
import { RequestHandler } from "express";
import { issueJWTTokens } from "../../middlewares/authTokenHandler.js";
import { attachRefreshToken, saveRefreshToken } from "./refreshTokenHelper.js";
import User from "../../models/User.js";
import logger from "../../utils/logger.js";
import ResetToken from "../../models/ResetToken.js";
import { sendPasswordResetLink } from "../../services/emails/email.js";
import { CLIENT_URL } from "../../config.js";

/* Handle generation and delivery of password reset token / url  */
export const reset: RequestHandler = async (req, res, next) => {
  try {
    // Get user input from request
    const { email } = req.body;
    logger.verbose(`Request to reset password for user:  ${email}`);

    // Validate user input
    if (!email) {
      throw new Error(`Provide email to reset password`);
    }

    // Find user account with provided email
    const user = await User.findOne(
      { email, isDeleted: { $ne: true } },
      { email: 1, _id: 1 }
    );
    if (!user) {
      throw new Error(`No user with provided email found`);
    }

    // Generate new reset token and save it to the database
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedResetToken = await bcrypt.hash(resetToken, 12);

    await new ResetToken({
      user: user._id,
      value: hashedResetToken,
      expires: new Date(new Date().getTime() + 1000 * 60 * 30), // Token expires in 30 minutes
    }).save();

    // Send email to user with the reset link and code
    const resetUrl = `${CLIENT_URL}/restore?token=${resetToken}&email=${user.email}`;
    sendPasswordResetLink(user.email, hashedResetToken, resetUrl);

    // Send response back to client, but do not include the token
    res.status(200).json({
      status: "success",
      message: "Reset token has been sent to your email address",
    });
  } catch (error) {
    logger.error(
      `🔥 Could not generate reset password link (${(error as Error).message})`
    );
    next(error);
  }
};

/* Handle reset token verification and, if provided, password change */
export const confirmReset: RequestHandler = async (req, res, next) => {
  try {
    // Get user input from request body
    const { email, token, newPassword } = req.body;
    logger.verbose(`Attempt to confirm password reset for user:  ${email}`);

    // Find user account with provided email
    const user = await User.findOne(
      { email, isDeleted: { $ne: true } },
      { email: 1, password: 1, firstName: 1, lastName: 1, role: 1, photoUrl: 1 }
    );
    if (!user) throw new Error(`No user with provided email found`);

    // Check if provided reset token is valid - not expired and matches the latest one in the database
    const resetTokens = await ResetToken.find({ user: user._id })
      .sort({
        expires: -1,
      })
      .limit(1);
    const resetToken = resetTokens[0];
    if (!resetToken) throw new Error(`No data found for provided reset token`);

    const isValid = await bcrypt.compare(token, resetToken?.value as string);

    if (!isValid) throw new Error("Invalid or expired password reset token");

    // If new password is provided, update user password and generate new auth tokens
    if (newPassword) {
      user.password = newPassword;
      await user.save();

      // Generate access and refresh jwt tokens
      const [accessToken, refreshTokenValue] = issueJWTTokens(user);

      // Save new refresh token to the database
      await saveRefreshToken(user, refreshTokenValue);

      // Send auth tokens to user
      return attachRefreshToken(refreshTokenValue, res)
        .status(200)
        .json({
          status: "success",
          data: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            role: user.role,
            photoUrl: user.photoUrl,
          },
          message: "Password has been reset",
          accessToken,
        });
    }

    // If no new password is provided, send only a confirmation message
    res.status(200).json({
      status: "success",
      message: "Password reset token is valid",
    });
  } catch (error) {
    logger.error(
      `🔥 Error resetting password or verifying reset token (${
        (error as Error).message
      })`
    );
    next(error);
  }
};
