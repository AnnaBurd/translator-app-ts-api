import { Request } from "express";

import jwt, { JwtPayload } from "jsonwebtoken";

import { IUser } from "../../models/User.js";
import { HydratedDocument } from "mongoose";

interface UserInfoPayload extends JwtPayload {
  userid: string;
}

import {
  REFRESH_TOKEN_EXPIRES_IN,
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_TOP_SECRET,
  ACCESS_TOKEN_TOP_SECRET,
  REFRESH_TOKEN_NAME,
} from "../../config.js";
import { AppError, AppErrorName } from "../../middlewares/errorHandler.js";

const refreshTokenExpiresIn = REFRESH_TOKEN_EXPIRES_IN
  ? +REFRESH_TOKEN_EXPIRES_IN
  : 10 * 24 * 60 * 60 * 1000;

const accessTokenExpiresIn = ACCESS_TOKEN_EXPIRES_IN
  ? +ACCESS_TOKEN_EXPIRES_IN
  : 1000 * 60 * 5;

const issueRefreshToken = (user: HydratedDocument<IUser>) => {
  const payload: UserInfoPayload = { userid: user._id.toString() };

  return jwt.sign(payload, REFRESH_TOKEN_TOP_SECRET as string, {
    expiresIn: refreshTokenExpiresIn,
  });
};

export const issueAccessTokenById = (userid: string) => {
  return jwt.sign({ userid }, ACCESS_TOKEN_TOP_SECRET as string, {
    expiresIn: accessTokenExpiresIn,
  });
};

export const issueAccessToken = (user: HydratedDocument<IUser>) => {
  return issueAccessTokenById(user._id.toString());
};

export const issueJWTTokens = (user: HydratedDocument<IUser>) => {
  const accessToken = issueAccessToken(user);
  const refreshToken = issueRefreshToken(user);

  return [accessToken, refreshToken];
};

// Wrap jwt.verify() functionality to use in async-await form
// Note: according to documentation, async form is not really required and it is safe to use sync version unless token values are read as streams from file system / other non-blocking source
// Reference: https://github.com/auth0/node-jsonwebtoken/issues/566
const jwtVerify = async (token: string, secret: string) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, secret, (err, decoded) => {
      if (err) return reject(err);
      resolve(decoded);
    });
  });
};

export const verifyAccessToken = async (req: Request) => {
  // Note: client should set http header key:value, where token is the access jwt token recieved from server:
  // Authorization: Bearer {token}
  const authHeader = req.headers["authorization"];
  if (!authHeader)
    throw new AppError(
      AppErrorName.AuthenticationError,
      "No Access Token Provided"
    );

  const encodedToken = authHeader.split(" ")[1];
  const decodedToken = await jwtVerify(
    encodedToken,
    ACCESS_TOKEN_TOP_SECRET as string
  );

  return decodedToken as UserInfoPayload;
};

export const verifyRefreshToken = async (
  req: Request
): Promise<[UserInfoPayload, string]> => {
  // Note: browser on client side should automatically attach refresh token from http-only cookie to the request
  // Requires to configure cors policies, also requires to configure credentials: include on the client fetch api.

  const encodedToken = req.cookies[REFRESH_TOKEN_NAME as string];
  if (!encodedToken)
    throw new AppError(
      AppErrorName.AuthenticationError,
      "No Refresh Token Provided"
    );

  const decodedToken = await jwtVerify(
    encodedToken,
    REFRESH_TOKEN_TOP_SECRET as string
  );

  return [decodedToken as UserInfoPayload, encodedToken];
};
