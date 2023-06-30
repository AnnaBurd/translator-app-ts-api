import { Block } from "./Doc.js";

export interface TranslationBlock extends Block {
  editedManually?: boolean;
}
