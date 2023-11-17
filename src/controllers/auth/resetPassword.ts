import crypto from "crypto";
import bcrypt from "bcrypt";
import { RequestHandler } from "express";

import { attachRefreshToken, saveRefreshToken } from "./refreshTokenHelper.js";
import User from "../../models/User.js";
import logger from "../../utils/logger.js";
import ResetToken from "../../models/ResetToken.js";
import { sendPasswordResetLink } from "../../services/emails/email.js";
import { CLIENT_URL } from "../../config.js";
import { issueJWTTokens } from "./tokenHelper.js";

/* Handle generation and delivery of password reset token / url  */
/**
 * @swagger
 * /api/users/reset:
 *  post:
 *   description: Request password reset for user with provided email. Sends password reset link to user's email address.
 *   tags: [Password Reset]
 *   requestBody:
 *     required: true
 *     content:
 *      application/json:
 *        schema:
 *         type: object
 *         properties:
 *          email:
 *            type: string
 *            example: example@mail.com
 *            required: true
 *   responses:
 *    200:
 *     description: Successfully generated reset link and sent to specified email address.
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
 *              example: Reset token has been sent to your email address
 */
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
    const resetUrl = `${CLIENT_URL}restore?token=${resetToken}&email=${user.email}`;
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
/**
 * @swagger
 * /api/users/confirm-reset:
 *  post:
 *   description: Confirm the validity of the reset token and change password.
 *   tags: [Password Reset]
 *   requestBody:
 *     required: true
 *     content:
 *      application/json:
 *        schema:
 *         type: object
 *         properties:
 *          email:
 *            type: string
 *            example: example@mail.com
 *            required: true
 *          token:
 *            type: string
 *            example: bk18-20020a17090b081200b002680f0f2886sm378458pjb.12
 *            required: true
 *          newPassword:
 *            type: string
 *            example: 123456789
 *            required: false
 *   responses:
 *    200:
 *     description: Reset token is valid. If the new password is provided, it is changed and new auth tokens are generated and sent to the client.
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
 *              example: Password has been reset
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
