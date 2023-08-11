import { ChatCompletionRequestMessageRoleEnum as APIRole } from "openai";
import { Block, Language, TranslationBlock } from "../../models/Doc.js";

import { generatePrompt } from "./prompt.js";

import queue from "./queue.js";
import { AppError, AppErrorName } from "../../middlewares/errorHandler.js";
import { fetchAPIResponse } from "./fetch-openai.js";
import logger from "../../utils/logger.js";
import { type } from "os";

export interface APIMessage {
  role: APIRole;
  content: string;
  relevantBlockId?: string;
  attachToPrompt?: boolean;
  tokens?: number;
  timestamp?: Date;
}

export enum EditOption {
  newOriginalBlock = "newOriginalBlock",
  editOriginalBlock = "editOriginalBlock",
  removeBlocks = "removeBlocks",
}

export const translateBlockContent = async (
  block: Block,
  history?: Array<APIMessage>,
  options?: {
    originalLanguage?: Language;
    targetLanguage?: Language;
    type?: EditOption;
  }
): Promise<[TranslationBlock, Array<APIMessage>]> => {
  logger.verbose(
    `💬 New translation task (${type}): ${block.blockId} - ${block.text}`
  );

  if (block.text.length > 2500) {
    throw new AppError(
      AppErrorName.ValidationError,
      "Text too long for translation"
    );
  }

  // Generate prompt based on previous history of document messages and on the examples from the sample translation dataset
  const [prompt, newMessages] = await generatePrompt(block, history, options);

  // Queue the request to OpenAI API (to avoid rate limit errors)
  const apiResponse = await queue.add(() => fetchAPIResponse(prompt));

  if (!apiResponse)
    throw new AppError(
      AppErrorName.ApiError,
      "Did not recieve translation text from API"
    );

  // Save the translated text and specify how many tokens each message costed
  const [translatedText, usage] = apiResponse;

  const translatedBlock: TranslationBlock = { ...block, text: translatedText };

  newMessages[newMessages.length - 1].tokens = usage.prompt_tokens;
  newMessages.push({
    role: APIRole.Assistant,
    content: translatedText,
    attachToPrompt: false,
    relevantBlockId: block.blockId,
    tokens: usage.completion_tokens,
  });

  // Return translated block and the new messages that were sent and recieved from the API
  return [translatedBlock, newMessages];
};
