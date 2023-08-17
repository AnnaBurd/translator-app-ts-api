import { Schema, model } from "mongoose";
import { APIMessage } from "../services/translation/translation.js";
import { IUser } from "./User.js";
import slugify from "../utils/slugify.js";
import makeid from "../utils/makeid.js";

export enum Language {
  Ru = "ru",
  En = "en",
  Vn = "vn",
}

export interface Block {
  blockId: string;
  text: string;
}

export interface TranslationBlock extends Block {
  editedManually?: boolean;
}

export interface IDoc {
  owner: IUser;
  title: string;
  slug: string;
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
  slug: { type: String, unique: true },
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

schema.index({ owner: 1 });
schema.index({ slug: 1 });
schema.index({ lastChangedAt: -1 });

// Update changed at timestamp on document save
schema.pre("save", async function (next) {
  this.changedAt = new Date();
  return next();
});

// Make sure document has a title
schema.pre("save", async function (next) {
  if (this.title && this.title.length !== 0) return next();
  this.title = "Untitled document";
  return next();
});

// Generate unique slugs for new docs
schema.pre("save", async function (next) {
  if (this.slug) return next(); // Slug is already created

  const generatedSlug = slugify(this.title, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });

  // Check if slug is unique by searching for the same slug it the database?
  // Ney - instead attach randomly generated string to the slug
  // In rare cases it will be the same as another slug, and the db will respond in error
  const randomString = makeid(6);
  this.slug = generatedSlug + "-" + randomString;
  console.log(this, generatedSlug);

  return next();
});

const Doc = model<IDoc>("Doc", schema);

export default Doc;
