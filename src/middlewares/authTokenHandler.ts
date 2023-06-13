import { Request } from "express";

import jwt, { JwtPayload } from "jsonwebtoken";

import { IUser } from "../models/User";

interface UserInfoPayload extends JwtPayload {
  email: string;
}

const issueRefreshToken = (user: IUser) => {
  const payload: UserInfoPayload = { email: user.email };

  const token = jwt.sign(
    payload,
    process.env.REFRESH_TOKEN_TOP_SECRET as string,
    {
      expiresIn: "15d", // TODO: in prod:  set 1d? 5d? 1month? (how long user can be logged in until loggin again is required) minutes
    }
  );

  return token;
};

export const issueAccessToken = (user: IUser) => {
  const payload: UserInfoPayload = { email: user.email };

  const token = jwt.sign(
    payload,
    process.env.ACCESS_TOKEN_TOP_SECRET as string,
    {
      expiresIn: "30s", // TODO: in prod:  set 5-15 minutes
    }
  );

  return token;
};

export const issueJWTTokens = (user: IUser) => {
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
  if (!authHeader) throw new Error("No Access Token Provided");

  const encodedToken = authHeader.split(" ")[1];
  const decodedToken = await jwtVerify(
    encodedToken,
    process.env.ACCESS_TOKEN_TOP_SECRET as string
  );

  return decodedToken as UserInfoPayload;
};

export const verifyRefreshToken = async (
  req: Request
): Promise<[UserInfoPayload, string]> => {
  // Note: browser on client side should automatically attach refresh token from http-only cookie to the request
  // Requires to configure cors policies, also requires to configure credentials: include on the client fetch api.

  const encodedToken = req.cookies["translator-app"];
  if (!encodedToken) throw new Error("No Refresh Token Provided");

  const decodedToken = await jwtVerify(
    encodedToken,
    process.env.REFRESH_TOKEN_TOP_SECRET as string
  );

  return [decodedToken as UserInfoPayload, encodedToken];
};
