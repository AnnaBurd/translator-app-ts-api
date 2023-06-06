import { Schema, model } from "mongoose";

export interface Block {
  blockId: string;
  index: number;
  text: string;
}

export interface IDoc {
  title: string;
  lang: string;
  content: Array<Block>;
  //   translations: Array<ITranslation>;
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
});

const Doc = model<IDoc>("Doc", schema);

export default Doc;
