import { RequestHandler, Response } from "express";
import {
  issueAccessToken,
  issueJWTTokens,
  verifyRefreshToken,
} from "../middlewares/authTokenHandler";
import logger from "../utils/logger";
import User from "../models/User";

/* Explanation Notes:
Authentication is based on usage of refresh and access jwt tokens:

- Refresh Token: lasts long time (not infinitely for security reasons). Used to re-issue access tokens, and is supposed to be stored as httpOnly secure cookie on the frontend (managed by browser, not accessible with js)

- Access Token: expires fast, is supposed to be stored only im memory on the frontend

- Refresh API Route: re-issues new access token using valid refresh token, is suppossed to be continuously re-called from the client side

Auth workflow:
client -> request signup/login (provide email and password)
server -> issue new refresh token and access token
client -> request protected server apis with access token
server -> provide resourses until token expires
client (when token expires) -> request access refresh (provide refresh token (handled as http only cookie by browser))
server -> issue new access token ...
*/

const attachRefreshToken = (value: string, res: Response) => {
  res.cookie("translator-app", value, {
    maxAge: 24 * 60 * 60 * 1000,
    // sameSite: "none", // TODO: fix for prod
    secure: false, // TODO: set secure true and test in the production mode
    httpOnly: true,
  });

  return res;
};

// Make client side delete cookie (?)
const detatchRefreshToken = (res: Response) => {
  // TODO: make sure cookie options are the same as when attaching cookie
  // Todo: test if cookie gets deleted in prod mode
  res.clearCookie("translator-app", { httpOnly: true }); // secure: true
};

export const signup: RequestHandler = async (req, res, next) => {
  try {
    // Get user input from request
    const { firstName, lastName, email, password } = req.body;
    logger.verbose(`Signing up new user: ${firstName} (${email})`);

    // Validate user input
    const newUser = new User({ firstName, lastName, email, password });
    await newUser.validate();

    // Generate access and refresh jwt tokens
    const [accessToken, refreshToken] = issueJWTTokens(newUser);

    // Save new user into db (refresh token is also stored in database to allow log-out functionality)
    newUser.refreshToken = refreshToken;
    await newUser.save({ validateBeforeSave: false });

    // Send auth tokens to user
    attachRefreshToken(refreshToken, res)
      .status(201)
      .json({
        status: "success",
        data: {
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
        },
        accessToken,
      });
  } catch (error) {
    logger.error(`🔥 Could not sign up user (${(error as Error).message})`);
    next(error);
  }
};

export const signin: RequestHandler = async (req, res, next) => {
  try {
    // Get user input from request
    const { email, password } = req.body;
    logger.verbose(`Signing in user: ${email}`);

    // Validate user input
    if (!email || !password) {
      throw new Error(`Provide email and password to sign in`);
    }
    const user = await User.findOne({ email });
    if (!user || !(await user.isCorrectPassword(password as string))) {
      throw new Error(`Incorrect user's credentials`);
    }

    // Generate signed in user token
    const [accessToken, refreshToken] = issueJWTTokens(user);

    // Save new refresh token to the database
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    // Send response back to client
    attachRefreshToken(refreshToken, res)
      .status(200)
      .json({
        status: "success",
        data: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
        },
        accessToken,
      });
  } catch (error) {
    logger.error(`🔥 Could not sign in user (${(error as Error).message})`);
    next(error);
  }
};

export const refreshAccess: RequestHandler = async (req, res, next) => {
  try {
    // Verify refresh token
    const [currentUserInfo, refreshToken] = await verifyRefreshToken(req);

    // Check that user still exists in the database and that refresh token is still valid
    const currentUser = await User.findOne({ email: currentUserInfo.email });
    if (!currentUser) {
      detatchRefreshToken(res);
      throw new Error("No Such User Exists (Anymore)");
    }

    // TODO: Check if user did not change password since token was issued (when change password functionality is implemented)
    if (currentUser.refreshToken !== refreshToken) {
      detatchRefreshToken(res);
      throw new Error("Refresh token is not valid (Anymore)");
    }

    // Re-Issue access token
    const accessToken = issueAccessToken(currentUser);
    res.status(201).json({
      status: "success",
      accessToken,
    });
  } catch (error) {
    logger.error(
      `🔥 Could not re-issue access token. Please sign in again (${
        (error as Error).message
      })`
    );
    next(error);
  }
};

// Note: on client should also delete access token
export const signout: RequestHandler = async (req, res, next) => {
  try {
    const currentlySignedInUser = req.currentUser!;

    // Delete refresh token in database
    await User.findOneAndUpdate(
      { email: currentlySignedInUser.email },
      { refreshToken: "signed-out" }
    );

    // Delete resresh token cookie
    detatchRefreshToken(res);

    res.status(204).json({
      status: "success",
      message: "logout",
    });
  } catch (error) {
    logger.error(`🔥 Could not log out (${(error as Error).message})`);
    next(error);
  }
};
