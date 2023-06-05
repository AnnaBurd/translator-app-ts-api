import { Response } from "express";

import jwt from "jsonwebtoken";

import { IUser } from "../models/User";

export const attachJWTToken = (user: IUser, res: Response) => {
  const token = jwt.sign(
    { email: user.email },
    process.env.TOKEN_SUPER_SECRET as string,
    { expiresIn: "1d" }
  );

  console.log(token);

  res.cookie("translator-app", token, {
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    secure: true,
    httpOnly: true,
  });
};
