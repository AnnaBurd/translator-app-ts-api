import { ChatCompletionRequestMessageRoleEnum as APIRole } from "openai";
import { Block, Language, TranslationBlock } from "../../models/Doc.js";

import { generatePrompt } from "./prompt.js";

import queue from "./queue.js";
import { AppError, AppErrorName } from "../../middlewares/errorHandler.js";
// import { fetchAPIResponse } from "./fetch-openai.js";
import { fetchAPIResponse } from "./fetch-azure.js";
import logger from "../../utils/logger.js";

const NUM_OF_TRANSLATION_ATTEMPTS = 10;

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

  console.log(
    "💬 Generated context-aware prompt (series of messages):",
    prompt
  );

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

  const isTranslationTooLong = (text: string) =>
    text.length > block.text.length * 2.2 && text.length > 50;

  const translationContainsJibberish = (text: string) =>
    text.includes("🤍") || text.includes("♦");

  const isTranslationSuspicious = (text: string) =>
    isTranslationTooLong(text) || translationContainsJibberish(text);

  while (
    isTranslationSuspicious(translatedText) &&
    numOfAttempts < NUM_OF_TRANSLATION_ATTEMPTS
  ) {
    numOfAttempts++;

    const warningMessage = isTranslationTooLong(translatedText)
      ? `Translated text is too long compared to the original (${translatedText.length} vs ${block.text.length})`
      : `Translated text contains gibberish symbols`;

    logger.warn(`🔥 ${warningMessage}, trying again (${numOfAttempts})`);

    console.log("Incorrect translation:\n" + translatedText);

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

  const translationIsStillSuspicious =
    numOfAttempts >= NUM_OF_TRANSLATION_ATTEMPTS &&
    isTranslationSuspicious(translatedText);
  // Last resolve - remove special characters from the translation:
  if (translationIsStillSuspicious) {
    if (translationContainsJibberish(translatedText)) {
      translatedText = translatedText.replace("🤍", "").replace("♦", "").trim();
      logger.warn(`🔥 Removed special characters from text: ${translatedText}`);
      translatedText = "🔶 Check this one: " + translatedText;
    }

    if (isTranslationTooLong(translatedText)) {
      translatedText = "🔎 Check this one: " + translatedText;
    }
  }

  const translatedBlock: TranslationBlock = { ...block, text: translatedText };

  newMessages[newMessages.length - 1].tokens = usage.prompt_tokens;
  newMessages[newMessages.length - 1].attachToPrompt =
    !translationIsStillSuspicious; // Do not attach to next prompts the user message that was not translated correctly
  newMessages.push({
    role: APIRole.Assistant,
    content: translatedText,
    attachToPrompt: !translationIsStillSuspicious, // Do not attach to next prompts incorrect translations
    relevantBlockId: block.blockId,
    tokens: usage.completion_tokens,
  });

  // Return translated block and the new messages that were sent and recieved from the API
  return [translatedBlock, newMessages];
};
