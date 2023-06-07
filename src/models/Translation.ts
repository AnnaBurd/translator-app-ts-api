import { Block } from "./Doc";

export interface TranslationBlock extends Block {
  editedManually?: boolean;
}
