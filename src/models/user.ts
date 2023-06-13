import { Schema, model } from "mongoose";

export interface IUser {
  name: string;
  email: string;
  password: string;
}

const userSchema = new Schema<IUser>({
  name: { type: String },
  email: {
    type: String,
    required: [true, "Please provide email"],
    unique: true,
  },
  password: { type: String, required: true },
});

userSchema.index({ email: 1 });

/* Provide custom error message for duplicate emails */
userSchema.post(
  "save",
  { errorHandler: true },
  function (error: any, doc, next) {
    if (error.code === 11000) {
      error.code = "Email already registered. Forgot the password?";
      next(error);
      //   next(new Error("Email already registered. Forgot the password?"));
    } else {
      next(error);
    }
  }
);

const User = model<IUser>("User", userSchema);

export default User;
