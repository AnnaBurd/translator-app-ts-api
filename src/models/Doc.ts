import { Schema, model } from "mongoose";
import { APIMessage, TranslationBlock } from "./Translation";

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
  title: string;
  originLang: Language;
  translationLang: Language;
  content: Array<Block>;
  translationContent: Array<TranslationBlock>;
  messagesHistory: Array<APIMessage>;
  createdAt: Date;
  changedAt: Date;
}

const schema = new Schema<IDoc>({
  title: {
    type: String,
    required: true,
    trim: true,
    default: "Document",
  },
  originLang: {
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
