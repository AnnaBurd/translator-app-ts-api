import { ChatCompletionRequestMessageRoleEnum as APIRole } from "openai";
import { Block, Language, TranslationBlock } from "../../models/Doc.js";

import { generatePrompt } from "./prompt.js";

import queue from "./queue.js";
import { AppError, AppErrorName } from "../../middlewares/errorHandler.js";
// import { fetchAPIResponse } from "./fetch-openai.js";
import { fetchAPIResponse } from "./fetch-azure.js";
import logger from "../../utils/logger.js";

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
    `💬 New translation task (${options?.type}): ${block.blockId} - ${block.text}`
  );

  if (block.text.length > 2500) {
    // TODO: split text into smaller chunks and translate them separately

    throw new AppError(
      AppErrorName.ValidationError,
      "💬 Text too long for translation"
    );
  }

  // Clear block text from any special characters
  block.text = block.text.replace(/[\n\r]/g, "").replaceAll("&nbsp;", " ");
  if (block.text.startsWith("+")) block.text = block.text.slice(1).trimStart();
  if (block.text.startsWith("-")) block.text = block.text.slice(1).trimStart();

  // Generate prompt based on previous history of document messages and on the examples from the sample translation dataset
  const maxTokens = Math.max(Math.round((block.text.length / 4) * 4), 100);
  const [prompt, newMessages] = await generatePrompt(block, history, options);

  console.log("💬 Generated prompt (series of messages):", prompt);

  // Queue the request to OpenAI API (to avoid rate limit errors)
  const apiResponse = await queue.add(() =>
    fetchAPIResponse(prompt, {
      maxTokens: maxTokens,
    })
  );

  if (!apiResponse)
    throw new AppError(
      AppErrorName.ApiError,
      "💬 Did not recieve translation text from API"
    );

  // Save the translated text and specify how many tokens each message costed
  let [translatedText, usage] = apiResponse;

  // Make sure the translated text is not much longer than the original text (rare cases when the API returns a lot of garbage text)
  let numOfAttempts = 0;
  while (
    translatedText.length > block.text.length * 1.6 &&
    translatedText.length > 20 &&
    numOfAttempts < 5
  ) {
    numOfAttempts++;

    logger.warn(
      `💬 Translated text is too long (${translatedText.length} vs ${block.text.length}), trying again (${numOfAttempts})`
    );

    const secondAttemptResponse = await queue.add(() =>
      fetchAPIResponse(prompt, {
        maxTokens: maxTokens,
      })
    );

    if (!secondAttemptResponse) {
      logger.warn(`💬 Attempt ${numOfAttempts} failed`);

      break;
    }

    // If the second attempt was successful, use the new response, discard the old one (including the tokens), and check again if the text is too long
    [translatedText, usage] = secondAttemptResponse;
  }

  const translatedBlock: TranslationBlock = { ...block, text: translatedText };

  newMessages[newMessages.length - 1].tokens = usage.prompt_tokens;
  newMessages.push({
    role: APIRole.Assistant,
    content: translatedText,
    attachToPrompt: true,
    relevantBlockId: block.blockId,
    tokens: usage.completion_tokens,
  });

  // Return translated block and the new messages that were sent and recieved from the API
  return [translatedBlock, newMessages];
};
