import { Model, Schema, Document, model } from "mongoose";

import logger from "../utils/logger";
import User, { IUser } from "./User";

export interface IDoc extends Document {
  title: string;
  lang: string;
  content: [];
  translations: [];
  messagesHistory: [];
  createdAt: Date;
  changedAt: Date;
  owner: IUser["_id"];
}

export interface IDocMethods {
  //   hashPassword(): void;
  //   isCorrectPassword(inputPass: string): boolean;
}

export enum Language {
  Ru = "ru",
  En = "en",
  Vn = "vn",
}

type DocModel = Model<IDoc, {}, IDocMethods>;
const schema = new Schema<IDoc, DocModel, IDocMethods>({
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200,
    default: "Document",
  },
  lang: {
    type: String,
    default: Language.Ru,
    enum: { values: Object.values(Language) },
  },
  content: [{ editorId: String, index: Number, text: String }],
  translations: [
    {
      lang: {
        type: String,
        default: Language.Vn,
        enum: { values: Object.values(Language) },
      },
      content: [
        {
          editorId: String,
          index: Number,
          text: String,
          editedByHand: Boolean,
        },
      ],
    },
  ],
  messagesHistory: [
    { role: "String", content: "String", attachToPrompt: Boolean },
  ],
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  changedAt: {
    type: Date,
  },
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
});

const Doc = model<IDoc, DocModel>("Doc", schema);
export default Doc;
