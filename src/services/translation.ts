import {
  Configuration,
  OpenAIApi,
  ChatCompletionRequestMessageRoleEnum as APIRole,
} from "openai";
import logger from "../utils/logger.js";
import { Block, Language } from "../models/Doc.js";
import { TranslationBlock } from "../models/Translation.js";
import { generatePrompt } from "./prompt.js";
import { modelSettings } from "./translation.config.js";

import queue from "./queue.js";

export interface APIMessage {
  role: APIRole;
  content: string;
  relevantBlockId?: string;
  attachToPrompt?: boolean;
}

export enum TranslationOption {
  newOriginalBlock = "newOriginalBlock",
  editOriginalBlock = "editOriginalBlock",
}

// Imitate api requests for tests
const fetchAPIResponseFake = async (
  prompt: Array<APIMessage>
): Promise<string> => {
  try {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(console.log("Recieved API RESPONSE"));
      }, 1000);
    });

    return `Dummy translation: ${
      prompt[prompt.length - 1].content.split(":")[1]
    }`;
  } catch (error) {
    console.log(error);
    logger.error(`Could not fetch data from API: ${error}`);
    throw error;
  }
};

// Handle requests to OPEN AI API
const openai = new OpenAIApi(new Configuration({ apiKey: process.env.AI_KEY }));
const fetchAPIResponse = async (prompt: Array<APIMessage>): Promise<string> => {
  try {
    const response = await openai.createChatCompletion({
      ...modelSettings,
      messages: prompt,
    });

    if (
      !response ||
      !response.data.choices ||
      response.data.choices.length === 0
    )
      throw new Error("No completion");

    console.log("OPEN AI ", response);

    // TODO: handle token usage statistics
    // logger.log("Recieved API RESPONSE" + response.data.choices[0].message);

    const translatedText = response.data.choices[0].message!.content;

    if (!translatedText) throw new Error("No completion");
    return translatedText;
  } catch (error) {
    console.log(error);
    logger.error(`Could not fetch data from API: ${error}`);
    throw error;
  }
};

export const translateBlockContent = async (
  block: Block,
  history?: Array<APIMessage>,
  options?: {
    originalLanguage?: Language;
    targetLanguage?: Language;
    type?: TranslationOption;
  }
): Promise<[TranslationBlock, Array<APIMessage>]> => {
  console.log("Got block to translate: ", block, options);

  const [prompt, newMessages] = generatePrompt(block, history, options);

  // const translatedText = await fetchAPIResponseFake(prompt);
  // const translatedText = await fetchAPIResponse(prompt);

  const translatedText = await queue.add(() => fetchAPIResponseFake(prompt));
  if (!translatedText)
    throw new Error("Queue of api requests did not return translation text");

  const translatedBlock: TranslationBlock = { ...block, text: translatedText };

  newMessages.push({
    role: APIRole.Assistant,
    content: translatedText,
    attachToPrompt: true,
    relevantBlockId: block.blockId,
  });

  return [translatedBlock, newMessages];
};

// export const translateBlock = async (
//   block: Block,
//   history?: Array<APIMessage>
// ): Promise<[TranslationBlock, Array<APIMessage>]> => {
//   // console.log("Got block to translate: ", block);
//   // console.log("And Got Previous history: ", history);

//   const [prompt, newMessages] = generatePrompt(block, history);

//   const translatedText = await fetchAPIResponseFake(prompt);
//   // const translatedText = await fetchAPIResponse(prompt);

//   const translatedBlock: TranslationBlock = { ...block, text: translatedText };
//   newMessages.push({
//     role: APIRole.Assistant,
//     content: translatedText,
//     attachToPrompt: true,
//     relevantBlockId: block.blockId,
//   });

//   return [translatedBlock, newMessages];
// };

// TODO: handle translation queue for multiple users
// TODO: make sure that one text block does not exceed limit of characters
