import { Schema, model } from "mongoose";
import { TranslationBlock } from "./Translation.js";
import { APIMessage } from "../services/translation.js";
import { IUser } from "./User.js";

export enum Language {
  Ru = "ru",
  En = "en",
  Vn = "vn",
}

export interface Block {
  blockId: string;
  text: string;
}

// TODO: generate unique per user documents slugs for a nicer url
export interface IDoc {
  owner: IUser;
  title: string;
  // slug: string;
  lang: Language;
  translationLang: Language;
  content: Array<Block>;
  translationContent: Array<TranslationBlock>;
  messagesHistory: Array<APIMessage>;
  tokensUsed: number;
  createdAt: Date;
  changedAt: Date;
  deleted: boolean;
}

// docs: [{ type: Schema.Types.ObjectId, ref: "Doc" }],

const schema = new Schema<IDoc>({
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  title: {
    type: String,
    trim: true,
    default: "Untitled document",
  },
  // slug: { type: String, required: true },
  lang: {
    type: String,
    required: true,
    default: Language.Ru,
    enum: { values: Object.values(Language) },
  },
  translationLang: {
    type: String,
    required: true,
    default: Language.Vn,
    enum: { values: Object.values(Language) },
  },
  content: [
    {
      blockId: { type: String, required: true },
      text: { type: String, trim: true, required: true },
    },
  ],
  translationContent: [
    {
      blockId: { type: String, required: true },
      text: { type: String, trim: true, required: true },
      editedManually: Boolean,
    },
  ],
  messagesHistory: [
    {
      role: String,
      content: String,
      relevantBlockId: String,
      attachToPrompt: Boolean,
      tokens: { type: Number, default: 0 },
      timestamp: { type: Date, default: Date.now() },
    },
  ],
  tokensUsed: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  changedAt: {
    type: Date,
  },
  deleted: Boolean,
});

// Update changed at timestamp on document save
schema.pre("save", async function (next) {
  this.changedAt = new Date();
  return next();
});

const Doc = model<IDoc>("Doc", schema);

export default Doc;
