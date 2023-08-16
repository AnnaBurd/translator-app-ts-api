import { RequestHandler } from "express";
import { issueJWTTokens } from "./tokenHelper.js";
import { attachRefreshToken, saveRefreshToken } from "./refreshTokenHelper.js";
import { sendNotificationOnNewUser } from "../../services/emails/email.js";
import User from "../../models/User.js";
import logger from "../../utils/logger.js";

/* Handle registration of new user accounts, requires new user email (unique) and password. */
/**
 * @swagger
 * /api/users/signup:
 *  post:
 *   description: Create a new user account, based on the provided email and password.  <br/><br/> _Note - the refresh token is attached to the response as http-only cookie, it is not accessible from the client side code and is managed by client browser._
 *   tags: [User Authentication]
 *   requestBody:
 *     required: true
 *     content:
 *      application/json:
 *        schema:
 *         type: object
 *         properties:
 *          firstName:
 *            type: string
 *            example: Professor
 *          lastName:
 *            type: string
 *            example: Limibus
 *          email:
 *            type: string
 *            example: example@mail.com
 *            required: true
 *          password:
 *            type: string
 *            example: 123456
 *            required: true
 *   responses:
 *    201:
 *     description: User account created successfully
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
 *                newUser:
 *                  type: boolean
 *                  example: true
 *            accessToken:
 *                type: string
 *                example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyaWQiOiI2NGRjNzIyYTlkZTc3YzIyODM3Yzg1OGMiLCJpYXQiOjE2OTIxNjg3NDYsImV4cCI6MTY5MjQ2ODc0Nn0.zRHPJSvcNaMdL_YLuWCCzsUczXbA329JVKzMXI13dG8
 */
export const signup: RequestHandler = async (req, res, next) => {
  try {
    // Get input from request body
    const { firstName, lastName, email, password } = req.body;
    logger.verbose(`Signing up new user: ${firstName} (${email})`);

    // Validate input
    const newUser = new User({ firstName, lastName, email, password });
    await newUser.validate();

    // Generate access and refresh jwt tokens
    const [accessToken, refreshTokenValue] = issueJWTTokens(newUser);

    // Save new user into db and long-lasting refresh token to the database
    await newUser.save({ validateBeforeSave: false });
    await saveRefreshToken(newUser, refreshTokenValue);

    // Notify admin about new user
    sendNotificationOnNewUser(newUser.email);

    // Send response with attached tokens back to user
    attachRefreshToken(refreshTokenValue, res)
      .status(201)
      .json({
        status: "success",
        data: {
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          newUser: true,
        },
        accessToken,
      });
  } catch (error) {
    logger.error(`🔥 Could not sign up user (${(error as Error).message})`);
    next(error);
  }
};
