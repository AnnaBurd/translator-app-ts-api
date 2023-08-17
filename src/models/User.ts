import { Model, Schema, model } from "mongoose";
import bcrypt from "bcrypt";

/* Note: 
To correctly calculate monthly tokens usage per user, the values are reset to 0 on the first day of each month.

This is done by a MongoDB trigger function: 
exports = function () {
  const db = context.services.get("Cluster0").db("translator");
  const usersCollection = db.collection("users");
  const documentsCollection = db.collection("docs");
  
  const currentDate = new Date();
  const startingDate = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );

  const updateUsersUsage = async () => {
    const activeUsersUsageStatsThisMonth = await usersCollection
      .find(
        { tokensUsedMonth: { $gt: 0 } },
        { tokensUsedMonth: 1, wordsTranslatedMonth: 1 }
      )
      .toArray();

    // Save statistics for current month into the history
    activeUsersUsageStatsThisMonth.forEach(async (user) => {
      console.log("user", JSON.stringify(user));

      const documentsChangedThisMonth = await documentsCollection
        .find(
          { owner: user._id, changedAt: {$gt: startingDate}},
          { changedAt: 1 }
        )
        .toArray();

      usersCollection.findOneAndUpdate({_id: user._id}, {$push: {tokenUsageStats: {tokensUsedMonth: user.tokensUsedMonth, wordsTranslatedMonth: user.wordsTranslatedMonth, documentsChangedMonth: documentsChangedThisMonth.length, date: currentDate}}})
    });
    
    // Clear statistics for next month
    usersCollection.updateMany({}, {$set: {tokensUsedMonth: 0, wordsTranslatedMonth: 0}});
  };

  updateUsersUsage();
};


For correct work of the trigger function, the cluster should be "Linked Data Source" - there is a "Link" button in the Add Trigger window.
*/

export enum Role {
  User = "User",
  Admin = "Admin",
}

export interface ITokenUsageStats {
  tokensUsedMonth: number;
  wordsTranslatedMonth: number;
  documentsChangedMonth: number;
  date: Date;
}

export interface IUser {
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string;
  role?: Role;
  registrationDate?: Date;
  isBlocked?: boolean;
  isDeleted?: boolean;
  tokensLimit: number;
  tokensUsedMonth: number;
  wordsTranslatedMonth: number;
  tokensUsedTotal: number;
  tokenUsageStats: Array<ITokenUsageStats>;
  status: "active" | "inactive" | "blocked";
  photoUrl?: string;
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
  registrationDate: { type: Date, default: Date.now() },
  isBlocked: { type: Boolean },
  isDeleted: { type: Boolean },
  tokensLimit: { type: Number, default: 0 },
  tokensUsedMonth: { type: Number, default: 0 },
  wordsTranslatedMonth: { type: Number, default: 0 },
  tokensUsedTotal: { type: Number, default: 0 },
  tokenUsageStats: [
    {
      tokensUsedMonth: Number,
      wordsTranslatedMonth: Number,
      documentsChangedMonth: Number,
      date: Date,
    },
  ],
  status: { type: String, default: "inactive" },
  photoUrl: String,
});

schema.index({ email: 1 });
schema.index({ status: 1 });

// Implement method for password hashing
schema.method("hashPassword", async function hashPassword() {
  this.password = await bcrypt.hash(this.password, 12);
});

// Implement method for checking hashed passwords
schema.method(
  "isCorrectPassword",
  async function isCorrectPassword(inputPassword: string) {
    return await bcrypt.compare(inputPassword, this.password);
  }
);

// Issue names to anonymous users
schema.pre("save", async function (next) {
  if (!this.firstName) {
    this.firstName = this.email.split("@")[0];
  }
  next();
});

// Hash user passwords before saving to the database
schema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  await this.hashPassword();
  next();
});

// Convert email to lowercase
schema.pre("save", async function (next) {
  if (!this.isModified("email")) return next();

  this.email = this.email.toLowerCase();
  next();
});

// Update user's status
schema.pre("save", async function (next) {
  if (!this.isModified("isBlocked") && !this.isModified("tokensUsedMonth"))
    return next();

  if (this.tokensUsedMonth > 0 && !this.isBlocked) {
    this.status = "active";
  } else if (this.isBlocked) {
    this.status = "blocked";
  } else {
    this.status = "inactive";
  }

  next();
});

const User = model<IUser, UserModel>("User", schema);

export default User;
