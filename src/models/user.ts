import { Model, Schema, model } from "mongoose";
import bcrypt from "bcrypt";
import logger from "../utils/logger";

export interface IUser {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface IUserMethods {
  hashPassword(): void;
  isCorrectPassword(inputPass: string): boolean;
}

export enum Role {
  User = "USER",
  Admin = "ADMIN",
}

type UserModel = Model<IUser, {}, IUserMethods>;
const schema = new Schema<IUser, UserModel, IUserMethods>({
  name: { type: String },
  email: {
    type: String,
    required: [true, "Please provide email"],
    match: /.+\@.+\..+/,
    unique: true,
  },
  password: { type: String, required: true },
  role: { type: String, default: Role.User },
});

schema.index({ email: 1 });

schema.method("hashPassword", async function hashPassword() {
  this.password = await bcrypt.hash(this.password, 12);
});

schema.method("isCorrectPassword", async function isCorrectPassword(inputPass) {
  return await bcrypt.compare(inputPass, this.password);
});

/* Hash new passwords before saving into db */
schema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  logger.verbose(
    `Pre-save user middleware - hash pass: ${this.email} - ${this.password}`
  );
  await this.hashPassword();
  next();
});

/* Provide custom error message for duplicate emails */
schema.post("save", { errorHandler: true }, function (error: any, doc, next) {
  if (error.code === 11000) {
    error.code = "Email already registered. Forgot the password?";
    next(error);
    //   next(new Error("Email already registered. Forgot the password?"));
  } else {
    next(error);
  }
});

const User = model<IUser, UserModel>("User", schema);
export default User;
