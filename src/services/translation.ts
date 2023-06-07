import {
  Configuration,
  OpenAIApi,
  ChatCompletionRequestMessageRoleEnum as APIRole,
} from "openai";
import logger from "../utils/logger";
import { Block } from "../models/Doc";
import { TranslationBlock } from "../models/Translation";
import { generatePrompt } from "./prompt";
import { modelSettings } from "./translation.config";

export interface APIMessage {
  role: APIRole;
  content: string;
  relevantBlockId?: string;
  attachToPrompt?: boolean;
}

// Imitate api requests for tests
const fetchAPIResponse_Fake = async (
  prompt: Array<APIMessage>
): Promise<string> => {
  try {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(console.log("Recieved API RESPONSE"));
      }, 1000);
    });

    return `Translated Text ${Math.random().toString()}`;
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

    console.log(response);

    const translatedText = response.data.choices[0].message!.content;
    return translatedText;
  } catch (error) {
    console.log(error);
    logger.error(`Could not fetch data from API: ${error}`);
    throw error;
  }
};

export const translateBlock = async (
  block: Block,
  history?: Array<APIMessage>
): Promise<[TranslationBlock, Array<APIMessage>]> => {
  // console.log("Got block to translate: ", block);
  // console.log("And Got Previous history: ", history);

  const [prompt, newMessages] = generatePrompt(block, history);

  // const translatedText = await fetchAPIResponse_Fake(prompt);
  const translatedText = await fetchAPIResponse(prompt);

  const translatedBlock: TranslationBlock = { ...block, text: translatedText };
  newMessages.push({
    role: APIRole.Assistant,
    content: translatedText,
    attachToPrompt: true,
    relevantBlockId: block.blockId,
  });

  return [translatedBlock, newMessages];
};
