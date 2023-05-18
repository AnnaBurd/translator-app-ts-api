import { Request, Response, NextFunction } from "express";

import User, { IUser, IUserMethods } from "../models/user";

import jwt, { JwtPayload } from "jsonwebtoken";

export const attachJWTCookie = (user: IUser, res: Response): void => {
  const token = jwt.sign(
    { email: user.email },
    process.env.TOKEN_SUPER_SECRET as string,
    { expiresIn: "1d" }
  );

  res.cookie("translator-app-token", token, {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    secure: process.env.NODE_ENV !== "development", // only send with encrypted connection (https)
    httpOnly: true,
  });
};

export const getJWTValue = async (req: Request): Promise<JwtPayload> => {
  const encodedToken = req.cookies["translator-app-token"];

  const decodedToken = jwt.verify(
    encodedToken,
    process.env.TOKEN_SUPER_SECRET as string
  );

  return decodedToken as JwtPayload;
};
