import { Block } from "../models/Doc";
import { APIMessage, TranslationBlock } from "../models/Translation";
import { generatePrompt } from "./prompt";

export const translateBlock = async (
  block: Block,
  history?: Array<APIMessage>
): Promise<[TranslationBlock, Array<APIMessage>]> => {
  console.log("Got block to translate: ", block);
  console.log("And Got Previous history: ", history);

  // Generate prompt based on the history
  const prompt = generatePrompt(block, history);

  // Send API Call

  const translatedBlock: TranslationBlock = { ...block };
  const newHistoryMessages = [{ role: "", content: "" }];

  return [translatedBlock, newHistoryMessages];
};
