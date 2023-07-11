import { Model, Schema, model } from "mongoose";
import bcrypt from "bcrypt";

/* Note: 
To correctly calculate monthly tokens usage per user, the values are reset to 0 on the first day of each month.

This is done by a MongoDB trigger function: 
exports = function() {
  const collection = context.services.get("Cluster0").db("translator").collection("users");
  collection.updateMany({}, {$set: {tokensUsedMonth: 0}})
};

For correct work of the trigger function, the cluster should be "Linked Data Source" - there is a "Link" button in the Add Trigger window.
*/

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
  tokensLimit: number;
  tokensUsedMonth: number;
  tokensUsedTotal: number;
  registrationDate?: Date;
  isBlocked?: boolean;
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
  tokensLimit: { type: Number, default: 0 },
  tokensUsedMonth: { type: Number, default: 0 },
  tokensUsedTotal: { type: Number, default: 0 },
  registrationDate: { type: Date, default: Date.now() },
  isBlocked: { type: Boolean },
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
