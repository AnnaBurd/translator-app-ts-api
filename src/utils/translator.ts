import {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
  CreateChatCompletionRequest,
  Configuration,
  OpenAIApi,
} from "openai";

import { modelSettings, modelRoles } from "./translator-config";

import { Block, TranslationBlock, Message } from "../models/Doc";
import logger from "./logger";

const openai = new OpenAIApi(new Configuration({ apiKey: process.env.AI_KEY }));

const generatePrompt = (
  block: Block,
  messagesHistory: Array<Message>
): [Array<ChatCompletionRequestMessage>, Array<Message>] => {
  // TODO: how to store in memory to reduce computations?
  // Previous prompts context
  const previousMessages: Array<ChatCompletionRequestMessage> = messagesHistory
    .filter((msg) => msg.attachToPrompt)
    .map((msg) => {
      return {
        role: <ChatCompletionRequestMessageRoleEnum>msg.role,
        content: msg.content,
      };
    });

  const newOutMessages: Array<ChatCompletionRequestMessage> = [];

  // New prompt messages
  if (previousMessages.length === 0)
    newOutMessages.push({
      role: ChatCompletionRequestMessageRoleEnum.System,
      content: modelRoles.geologyExpert,
    });

  // TODO: refactor into another function with different options
  const userMessageContent = ` Переведи текст отчета по геологии с вьетнамского языка на русский:
  ${block.text}`;

  newOutMessages.push({
    role: ChatCompletionRequestMessageRoleEnum.User,
    content: userMessageContent,
  });

  const prompt = [...previousMessages, ...newOutMessages];

  const outMessagesHistory = newOutMessages.map((msg) => {
    return { ...msg, attachToPrompt: true };
  });

  return [prompt, outMessagesHistory];
};

export const translateBlock = async (
  block: Block,
  messagesHistory: Array<Message>
): Promise<[TranslationBlock, Array<Message>]> => {
  try {
    const [prompt, newOutMessages] = generatePrompt(block, messagesHistory);

    // Imitate api requests for tests --------------------------------
    await new Promise((res) => {
      setTimeout(res, Math.random() * 100);
    });

    const translatedText = `Translation : ${block.text.slice(0, 30)} ...`;

    // Request to Open AI API ----------------------------------------

    // const response = await openai.createChatCompletion({
    //   ...modelSettings,
    //   messages: prompt,
    // });
    // // console.log("Response from open ai: ", response);
    // if (
    //   !response ||
    //   !response.data.choices ||
    //   response.data.choices.length === 0
    // )
    //   throw new Error("No completion");

    // // const translatedText = completion?.data?.choices?[0]?.message.content;
    // const choices = response?.data?.choices; //?[0]?.message?.content;
    // const translatedText = choices[0].message?.content as string;

    const newInMessage = {
      role: "assistant",
      content: translatedText,
      attachToPrompt: true,
    };

    return [
      { blockId: block.blockId, index: block.index, text: translatedText },
      [...newOutMessages, newInMessage],
    ];
  } catch (error) {
    logger.error(`🔥 Can not get data from ai api  ${error}`);
    throw error;
  }
};
