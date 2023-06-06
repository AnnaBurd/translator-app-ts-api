import { Block } from "./Doc";

export enum Language {
  Ru = "ru",
  En = "en",
  Vn = "vn",
}

interface TranslationBlock extends Block {
  editedManually?: boolean;
}

interface APIMessage {
  role: string;
  content: string;
  attachToPrompt?: boolean;
}

interface ITranslation {
  lang: Language;
  content: Array<TranslationBlock>;
  messagesHistory: Array<APIMessage>;
}
