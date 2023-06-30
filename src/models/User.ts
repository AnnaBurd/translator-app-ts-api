import { Model, Schema, model } from "mongoose";
import bcrypt from "bcrypt";

export enum Role {
  User = "User",
  Admin = "Admin",
}

export interface IUser {
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string;
  role?: Role;
}

export interface IUserMethods {
  hashPassword(): void;
  isCorrectPassword(inputPassword: string): boolean;
}

export type UserModel = Model<IUser, {}, IUserMethods>;

const schema = new Schema<IUser, UserModel, IUserMethods>({
  firstName: String,
  lastName: String,
  email: {
    type: String,
    required: true,
    unique: true,
    match: /.+\@.+\..+/,
  },
  password: { type: String, required: true },
  role: { type: String, default: Role.User },
});

schema.index({ email: 1 });

// Issue names to anonymous users
schema.pre("save", async function (next) {
  if (!this.firstName) {
    this.firstName = this.email.split("@")[0];
  }
  next();
});

// Hash user passwords to store in the database
schema.method("hashPassword", async function hashPassword() {
  this.password = await bcrypt.hash(this.password, 12);
});

schema.method(
  "isCorrectPassword",
  async function isCorrectPassword(inputPassword: string) {
    return await bcrypt.compare(inputPassword, this.password);
  }
);

schema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  await this.hashPassword();
  next();
});

const User = model<IUser, UserModel>("User", schema);

export default User;
