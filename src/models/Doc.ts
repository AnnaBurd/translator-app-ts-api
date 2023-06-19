import { Schema, model } from "mongoose";
import { TranslationBlock } from "./Translation";
import { APIMessage } from "../services/translation";
import { IUser } from "./User";

export enum Language {
  Ru = "ru",
  En = "en",
  Vn = "vn",
}

export interface Block {
  blockId: string;
  text: string;
}

export interface IDoc {
  owner: IUser;
  title: string;
  lang: Language;
  translationLang: Language;
  content: Array<Block>;
  translationContent: Array<TranslationBlock>;
  messagesHistory: Array<APIMessage>;
  createdAt: Date;
  changedAt: Date;
}

// docs: [{ type: Schema.Types.ObjectId, ref: "Doc" }],

const schema = new Schema<IDoc>({
  owner: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  title: {
    type: String,
    required: true,
    trim: true,
    default: "Document",
  },
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
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  changedAt: {
    type: Date,
  },
});

const Doc = model<IDoc>("Doc", schema);

export default Doc;
