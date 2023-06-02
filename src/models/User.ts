import { Schema, model } from "mongoose";

export enum Role {
  User = "User",
  Admin = "Admin",
}

export interface IUser {
  name: string;
  email: string;
  password?: string;
  role: Role;
  docs: any[]; // *TODO:
}

const schema = new Schema<IUser>({
  name: String,
  email: {
    type: String,
    required: true,
    unique: true,
    match: /.+\@.+\..+/,
  },
  password: { type: String, required: true },
  role: { type: String, default: Role.User },
  docs: [String],
});

schema.index({ email: 1 });

// Issue names to anonymous users
schema.pre("save", async function (next) {
  console.log(this);
});

const User = model<IUser>("User", schema);

export default User;
