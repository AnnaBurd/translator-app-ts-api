import { Request, Response } from "express";

import jwt, { JwtPayload } from "jsonwebtoken";

import { IUser } from "../models/User";

interface UserInfoPayload extends JwtPayload {
  email: string;
}

export const attachJWTToken = (user: IUser, res: Response) => {
  const payload: UserInfoPayload = { email: user.email };

  const token = jwt.sign(payload, process.env.TOKEN_SUPER_SECRET as string, {
    expiresIn: "1d",
  });

  res.cookie("translator-app", token, {
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
    // secure: true, // TODO: set secure true and test in the production mode
    httpOnly: true,
  });
};

export const readJWTTokenValue = async (req: Request) => {
  const encodedToken = req.cookies["translator-app"];
  if (!encodedToken) throw new Error("No Auth Token Provided");

  const decodedToken = jwt.verify(
    encodedToken,
    process.env.TOKEN_SUPER_SECRET as string
  ) as UserInfoPayload;

  return decodedToken;
};
