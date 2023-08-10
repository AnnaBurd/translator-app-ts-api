import { Response } from "express";
import {
  REFRESH_TOKEN_NAME,
  REFRESH_TOKEN_EXPIRES_IN,
  NODE_ENV,
} from "../../config.js";
import { IUser, IUserMethods, UserModel } from "../../models/User.js";
import RefreshToken from "../../models/RefreshToken.js";
import { Document, Types } from "mongoose";

const TOKEN_NAME = REFRESH_TOKEN_NAME || "app-refresh-token";
const TOKEN_EXPIRES_IN = REFRESH_TOKEN_EXPIRES_IN
  ? +REFRESH_TOKEN_EXPIRES_IN
  : 10 * 24 * 60 * 60 * 1000;

// Set up httpOnly cookie with refresh token value (stored by client browser)
export const attachRefreshToken = (value: string, res: Response) => {
  // Development mode
  if (NODE_ENV === "development") {
    return res.cookie(TOKEN_NAME, value, {
      maxAge: TOKEN_EXPIRES_IN,
      secure: false,
      httpOnly: true,
    });
  }

  // Production mode
  return res.cookie(TOKEN_NAME, value, {
    maxAge: TOKEN_EXPIRES_IN,
    sameSite: "none",
    secure: true,
    httpOnly: true,
  });
};

// Remove refresh token value (managed by client browser)
export const detatchRefreshToken = (res: Response) => {
  // Development mode
  if (NODE_ENV === "development") {
    return res.clearCookie(TOKEN_NAME, { httpOnly: true, secure: false });
  }

  // Production mode
  return res.clearCookie(TOKEN_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
};

// Save refresh token value to the database (required for log-out functionality)
export const saveRefreshToken = async (
  newUser: Document<unknown, {}, IUser> &
    Omit<IUser & { _id: Types.ObjectId }, keyof IUserMethods> &
    IUserMethods,
  value: string
) => {
  await new RefreshToken({
    user: newUser,
    value,
    expires: new Date(new Date().getTime() + TOKEN_EXPIRES_IN),
  }).save();
};

// Verify that refresh token still exists in the database (timed-out tokens are deleted automatically)
export const verifyRefreshTokenExists = async (
  userid: string,
  value: string
) => {
  const issuedRefreshTokens = await RefreshToken.find({
    user: userid,
  });

  if (!issuedRefreshTokens.find((token) => token.value === value))
    throw new Error("Refresh token is not valid");
};
