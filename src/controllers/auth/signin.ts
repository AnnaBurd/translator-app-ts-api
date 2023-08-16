import { RequestHandler } from "express";
import { issueJWTTokens } from "./tokenHelper.js";
import { attachRefreshToken, saveRefreshToken } from "./refreshTokenHelper.js";
import User from "../../models/User.js";
import logger from "../../utils/logger.js";

/* Handle sign in of existing users, requires email and password. */
/**
 * @swagger
 * /api/users/signin:
 *  post:
 *   description: Sign in user account, based on the provided email and password. <br/><br/> _Note - the refresh token is attached to the response as http-only cookie, it is not accessible from the client side code and is managed by client browser._
 *   tags: [User Authentication]
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
 *          password:
 *            type: string
 *            example: 123456
 *            required: true
 *   responses:
 *    200:
 *     description: Successful sign in, returns user's data, access and refresh token.
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
export const signin: RequestHandler = async (req, res, next) => {
  try {
    // Get input from request body
    const { email, password } = req.body;
    logger.verbose(`Signing in user: ${email}`);

    // Validate input
    if (!email || !password) {
      throw new Error(`Provide email and password to sign in`);
    }

    // Find user in the database
    const user = await User.findOne(
      { email, isDeleted: { $ne: true } },
      { email: 1, password: 1, firstName: 1, lastName: 1, role: 1, photoUrl: 1 }
    );

    // Check if user exists and password is correct
    if (!user || !(await user.isCorrectPassword(password as string))) {
      throw new Error(`Incorrect user's credentials`);
    }

    // Generate new refresh and access tokens
    const [accessToken, refreshTokenValue] = issueJWTTokens(user);

    // Save new refresh token to the database
    await saveRefreshToken(user, refreshTokenValue);

    // Send response with attached tokens back to user
    attachRefreshToken(refreshTokenValue, res)
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
        accessToken,
      });
  } catch (error) {
    logger.error(`🔥 Could not sign in user (${(error as Error).message})`);
    next(error);
  }
};
