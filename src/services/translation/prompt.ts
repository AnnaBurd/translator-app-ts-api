import { ChatCompletionRequestMessageRoleEnum as APIRole } from "openai";

import { getPromptExamples } from "../datastore/store-local.js";

import { Block, Language } from "../../models/Doc.js";
import { APIMessage, EditOption } from "./translation.js";

import { promptSettings } from "./translation.config.js";

import {
  hardcodedExamples,
  hardcodedExamplesLength,
} from "../datastore/dataset/examples.js";

import logger from "../../utils/logger.js";

const modelSystemRoles = {
  geologyExpert:
    "You are a professor, expert in geology and geophysics, fluent in Russian and Vietnamese.",
};

const languages = {
  ru: "Russian",
  vn: "Vietnamese",
  en: "English",
};

export const generatePrompt = async (
  block: Block,
  history?: Array<APIMessage>,
  options?: {
    originalLanguage?: Language;
    targetLanguage?: Language;
    type?: EditOption;
  }
) => {
  // TODO: if user input is too long split on blocks
  const userInput = block.text;
  let promptLength = userInput.length;

  let prompt: Array<APIMessage> = [];
  const newMessages: Array<APIMessage> = [];

  const originalLanguage =
    (options?.originalLanguage as Language) || Language.Vn;
  const translationLanguage =
    (options?.targetLanguage as Language) || Language.Ru;

  const isFirstMessage = !history || history?.length === 0;

  // If it is a new document, generate initial system message which describes the role the model should play
  if (isFirstMessage) {
    const initialSystemMessage = {
      role: APIRole.System,
      content: modelSystemRoles.geologyExpert,
    };

    prompt.push(initialSystemMessage);

    newMessages.push({
      ...initialSystemMessage,
      attachToPrompt: true,
    });

    promptLength += initialSystemMessage.content.length;
  }

  // For consequent translations, attach to prompt initial system message and most recent messages from the history, up to the lengh threshold
  if (!isFirstMessage) {
    const previousMessages = history
      .filter((msg) => msg.attachToPrompt)
      .map((msg) => {
        return { role: msg.role, content: msg.content };
      });

    // Always attach the first message - it is the initial system message that describes the role the model should play
    prompt.push(previousMessages[0]);
    promptLength += prompt[0].content.length;

    // Attach the most recent messages (user input - model response pairs) from the history, up to the lengh threshold
    let attachHistoryMessagesStartingFrom = previousMessages.length;
    for (let i = previousMessages.length - 1; i > 1; i = i - 2) {
      // prompt.push(previousMessages[i - 1]);
      // prompt.push(previousMessages[i]);
      promptLength +=
        previousMessages[i - 1].content.length +
        previousMessages[i].content.length;

      if (promptLength > promptSettings.maxHistoryLength) {
        // Attach the messages to the prompt (in correct order)

        break;
      }

      attachHistoryMessagesStartingFrom = i - 1;
    }

    for (
      let i = attachHistoryMessagesStartingFrom;
      i < previousMessages.length;
      i++
    ) {
      prompt.push(previousMessages[i]);
    }
  }

  // logger.verbose(
  //   `📝 Attached history messages to prompt:
  //   \t • ${prompt.map((msg) => msg.content).join("\n\t • ")}`
  // );

  // Find similar translation pairs in the vector store (similarity search) and attach to prompt
  const similarTexts = await getPromptExamples(
    userInput,
    originalLanguage,
    translationLanguage,
    Math.min(
      promptSettings.maxExamplesLength, // Limit the number of examples to the maxExamplesLength
      promptSettings.maxPromptLength -
        promptSettings.maxInputLength - // Leave some space for the user input
        promptLength - // Already attached messages
        hardcodedExamplesLength // Leave some space for the hardcoded examples
    ) // Fill the prompt with examples from vector store up to the limit, but leave space for user input
  );

  // const hardcodedExamplesText = `Make sure to correctly translate the following company-related terminology:♦${hardcodedExamples
  //   .map(
  //     (pair) =>
  //       `${pair[originalLanguage === "vn" ? "vn" : "ru"]}🤍${
  //         pair[originalLanguage === "vn" ? "ru" : "vn"]
  //       }`
  //   )
  //   .join("♦")}`;

  // const examples =
  //   similarTexts.length > 0
  //     ? "Also use the following examples for reference, especially company-related terminology like well names or department names:♦" +
  //       similarTexts.map((pair, i) => `${pair[0]}🤍${pair[1]}`).join("♦") +
  //       "♦"
  //     : "";

  const originLang = originalLanguage === "vn" ? "vn" : "ru";
  const secondLang = originalLanguage === "vn" ? "ru" : "vn";

  const examplesForReference = `🤍🤍🤍 Use the following examples for reference, especially company-related terminology like well, oil fields or department names:
${
  similarTexts.length <= 0
    ? ""
    : similarTexts.map((pair) => `${pair[0]} ♦ ${pair[1]}`).join(" 🤍\n")
} 🤍\n`;

  const hardcodedTerminology = `🤍🤍🤍 Make sure to correctly translate the following company-related terminology:
${hardcodedExamples
  .map((pair) => `${pair[originLang]} ♦ ${pair[secondLang]}`)
  .join(" 🤍\n")} 🤍\n`;

  const command = `🤍🤍🤍 Translate from ${languages[originalLanguage]} to ${languages[translationLanguage]}`;

  const promptText = `${command}, make sure to make no grammar or spelling mistakes, improve readability if possible but keep translation accurate.
${hardcodedTerminology}${examplesForReference}


🤍🤍🤍 The text to translate:


${userInput}`;

  const newPromptMessage = {
    role: APIRole.User,
    content: promptText,
  };

  prompt.push(newPromptMessage);
  newMessages.push({
    ...newPromptMessage,
    content: userInput, // Keep the original user input in the message
    relevantBlockId: block.blockId,
    attachToPrompt: true,
  });

  logger.verbose(
    `📝 Generated prompt message (length: ${promptText.length}):
"${promptText}"`
  );

  return [prompt, newMessages];
};
