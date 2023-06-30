import {
  Configuration,
  OpenAIApi,
  ChatCompletionRequestMessageRoleEnum as APIRole,
  CreateChatCompletionResponse,
  CreateCompletionResponseUsage,
} from "openai";
import logger from "../utils/logger.js";
import { Block, Language } from "../models/Doc.js";
import { TranslationBlock } from "../models/Translation.js";
import { generatePrompt } from "./prompt.js";
import { modelSettings } from "./translation.config.js";

import queue from "./queue.js";
import { AppError, AppErrorName } from "../middlewares/errorHandler.js";
import { AI_KEY } from "../config.js";

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
const openai = new OpenAIApi(new Configuration({ apiKey: AI_KEY }));

const fetchAPIResponse = async (
  prompt: Array<APIMessage>
): Promise<[string, CreateCompletionResponseUsage]> => {
  let response;
  try {
    response = await openai.createChatCompletion({
      ...modelSettings,
      messages: prompt,
    });
  } catch (error) {
    if ((error as Error)?.message?.includes("429")) {
      console.log("TRYING AGAIN 429 AFTER DELAY");

      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(console.log("Second attempt to fetch Open AI response"));
        }, 1000 * 20);
      });

      response = await openai.createChatCompletion({
        ...modelSettings,
        messages: prompt,
      });
    } else {
      // all other errors
      throw error;
    }
  }

  if (response.status !== 200) {
    console.log("🔥🔥🔥 OPEN AI ERROR ", response.status, response.statusText);
    console.log(response.data);

    throw new AppError(
      AppErrorName.ApiError,
      `Open AI API refused request: ${response.status} ${response.statusText}`
    );
  }

  // Usage statistics
  const usage = response?.data?.usage;
  console.log("Usage statistics: ", usage);

  // Completion data
  const completion = response?.data?.choices[0]?.message?.content;
  console.log("Completion: ", completion);

  if (!completion)
    throw new AppError(AppErrorName.ApiError, "No completion from OPEN AI API");

  if (!usage) {
    logger.error(`No usage statistics from OPEN AI API: ${completion}`);
  }

  return [
    completion,
    usage || { total_tokens: 0, completion_tokens: 0, prompt_tokens: 0 },
  ];
};

export const translateBlockContent = async (
  block: Block,
  history?: Array<APIMessage>,
  options?: {
    originalLanguage?: Language;
    targetLanguage?: Language;
    type?: EditOption;
  }
): Promise<[TranslationBlock, Array<APIMessage>]> => {
  console.log("Got block to translate: ", block, options);

  const [prompt, newMessages] = generatePrompt(block, history, options);

  // const translatedText = await queue.add(() => fetchAPIResponseFake(prompt));
  // const translatedText = await fetchAPIResponse(prompt);
  // const res = await queue.add(() =>
  //   fetchAPIResponse(prompt)
  // );
  const apiResponse = await queue.add(() => fetchAPIResponse(prompt));

  if (!apiResponse)
    throw new AppError(
      AppErrorName.ApiError,
      "Did not recieve translation text from API"
    );

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

  return [translatedBlock, newMessages];
};

// TODO: make sure that one text block does not exceed limit of characters
