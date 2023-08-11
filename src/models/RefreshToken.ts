import { Schema, model } from "mongoose";

/* Storing multiple refresh tokens per user allows users to log in in different devices

Note: 
 - Refresh tokens can also be stored as embedded mongo db documents per user, but such approach requires manual implementation of the TTL token policies (Mongo DB applies TTL strictly on per document basis).
 - Another reason to move refresh tokens into a separate collection is the logical detachment of the user account details - user activity details */

interface IRefreshToken {
  user: { type: Schema.Types.ObjectId; ref: "User" };
  value: String;
  expires?: Date;
  created?: Date;
}

const schema = new Schema<IRefreshToken>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  value: String,
  expires: Date,
  created: { type: Date, default: Date.now() },
});

schema.index({ user: 1 });
// Note: Mongo DB TTL index should automatically remove expired tokens
schema.index({ expires: -1 }, { expireAfterSeconds: 0 });

const RefreshToken = model<IRefreshToken>("RefreshToken", schema);

export default RefreshToken;
