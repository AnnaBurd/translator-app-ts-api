import { RequestHandler, Response } from "express";
import {
  issueAccessToken,
  issueAccessTokenById,
  issueJWTTokens,
  verifyRefreshToken,
} from "../middlewares/authTokenHandler.js";
import logger from "../utils/logger.js";
import User from "../models/User.js";
import RefreshToken from "../models/RefreshToken.js";

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

const REFRESH_TOKEN_NAME = "translator-app-refresh-token";

const attachRefreshToken = (value: string, res: Response) => {
  res.cookie(REFRESH_TOKEN_NAME, value, {
    maxAge: 24 * 60 * 60 * 1000, // TODO: set up to 15 days
    // sameSite: "none", // TODO: fix for prod
    secure: false, // TODO: set secure for https connections
    httpOnly: true,
  });

  return res;
};

// Make client side delete cookie (?)
export const detatchRefreshToken = (res: Response) => {
  // TODO: make sure cookie options are the same as when attaching cookie
  // TODO: test if cookie gets deleted in prod mode
  res.clearCookie(REFRESH_TOKEN_NAME, { httpOnly: true }); // secure: true
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
    const [accessToken, refreshTokenValue] = issueJWTTokens(newUser);

    // Save new user into db (refresh token is also stored in database to allow log-out functionality)
    await newUser.save({ validateBeforeSave: false });
    await new RefreshToken({
      user: newUser,
      value: refreshTokenValue,
      expires: new Date(new Date().getTime() + 86400000 * 15),
    }).save();

    // Send auth tokens to user
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

export const signin: RequestHandler = async (req, res, next) => {
  try {
    // Get user input from request
    const { email, password } = req.body;
    logger.verbose(`Signing in user: ${email}`);

    // Validate user input
    if (!email || !password) {
      throw new Error(`Provide email and password to sign in`);
    }
    const user = await User.findOne({ email, isDeleted: { $ne: true } });
    if (!user || !(await user.isCorrectPassword(password as string))) {
      throw new Error(`Incorrect user's credentials`);
    }

    // Generate signed in user token
    const [accessToken, refreshTokenValue] = issueJWTTokens(user);

    // Save new refresh token to the database
    await new RefreshToken({
      user: user,
      value: refreshTokenValue,
      expires: new Date(new Date().getTime() + 86400000 * 15),
    }).save();

    // Imitate long server response
    // await new Promise((resolve) => {
    //   setTimeout(() => {
    //     resolve(console.log("Recieved API RESPONSE"));
    //   }, 3000);
    // });

    // Send response back to client
    attachRefreshToken(refreshTokenValue, res)
      .status(200)
      .json({
        status: "success",
        data: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
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
    // Decode token payload value from the user request
    const [currentUserInfo, refreshTokenValue] = await verifyRefreshToken(req);

    // console.log("currentUserInfo", currentUserInfo);

    // Check that refresh token is still valid
    // Note: Refresh token can expire, so if the database TTL policy works correctly expired tokens should be automatically removed
    const issuedRefreshTokens = await RefreshToken.find({
      user: currentUserInfo.userid,
    });

    // console.log("issuedRefreshTokens", issuedRefreshTokens);

    if (
      !issuedRefreshTokens.find((token) => token.value === refreshTokenValue)
    ) {
      detatchRefreshToken(res);
      throw new Error("Refresh token is not valid (Anymore)");
    }

    // Re-Issue access token
    const accessToken = issueAccessTokenById(currentUserInfo.userid);
    res.status(200).json({
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

// Silent signin - the only difference from the refresh is that this one returns user data as well
// TODO: can be refactored to reduce code duplication
export const silentSignIn: RequestHandler = async (req, res, next) => {
  try {
    // Decode token payload value from the user request
    const [currentUserInfo, refreshTokenValue] = await verifyRefreshToken(req);

    // Check that refresh token is still valid
    // Note: Refresh token can expire, so if the database TTL policy works correctly expired tokens should be automatically removed
    const issuedRefreshTokens = await RefreshToken.find({
      user: currentUserInfo.userid,
    });

    if (
      !issuedRefreshTokens.find((token) => token.value === refreshTokenValue)
    ) {
      detatchRefreshToken(res);
      throw new Error("Refresh token is not valid (Anymore)");
    }

    // Imitate long server response
    // await new Promise((resolve) => {
    //   setTimeout(() => {
    //     resolve(console.log("Recieved API RESPONSE"));
    //   }, 1000);
    // });

    // Re-Issue access token
    const accessToken = issueAccessTokenById(currentUserInfo.userid);

    const user = await User.findOne({
      _id: currentUserInfo.userid,
      isDeleted: { $ne: true },
    });

    if (!user) {
      throw new Error("User does not exist (Anymore)");
    }

    res.status(200).json({
      status: "success",
      accessToken,
      data: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    logger.error(
      `🔥 Could not re-issue access token. Please sign (${
        (error as Error).message
      })`
    );
    next(error);
  }
};

// Note: on client should also delete access token
export const signout: RequestHandler = async (req, res, next) => {
  try {
    // Verify refresh token (if token is valid, returns signed in user id)
    const [currentUserInfo, refreshTokenValue] = await verifyRefreshToken(req);

    // Delete refresh token from the database
    await RefreshToken.findOneAndRemove({
      user: currentUserInfo.userid,
      value: refreshTokenValue,
    });

    // Inform browser on client side that refresh token cookie should be deleted
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
