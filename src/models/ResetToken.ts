import { Schema, model } from "mongoose";

interface IResetToken {
  user: { type: Schema.Types.ObjectId; ref: "User" };
  value: String;
  expires?: Date;
  created?: Date;
}

const schema = new Schema<IResetToken>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  value: String,
  expires: Date,
  created: { type: Date, default: Date.now() },
});

schema.index({ user: 1 });
// Note: Special Mongo DB TTL index should automatically remove expired tokens
schema.index({ expires: -1 }, { expireAfterSeconds: 0 });

const ResetToken = model<IResetToken>("ResetToken", schema);

export default ResetToken;
