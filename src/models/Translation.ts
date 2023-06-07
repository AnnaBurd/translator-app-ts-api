import { Block } from "./Doc";

export interface TranslationBlock extends Block {
  editedManually?: boolean;
}

// enum APIRole = {

// }

export interface APIMessage {
  role: string;
  content: string;
  relevantBlockId?: string;
  attachToPrompt?: boolean;
}
