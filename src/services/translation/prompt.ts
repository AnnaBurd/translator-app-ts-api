import { ChatCompletionRequestMessageRoleEnum as APIRole } from "openai";

// import { getPromptExamples } from "../store/store.js";
import { getPromptExamples } from "../store/store-local.js";

import { Block, Language } from "../../models/Doc.js";
import { APIMessage, EditOption } from "./translation.js";

import { promptSettings } from "./translation.config.js";
import logger from "../../utils/logger.js";

const modelSystemRoles = {
  geologyExpert: "You have an Ph.D in petroleum geology",
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
      content: `${modelSystemRoles.geologyExpert}, fluent in ${languages[originalLanguage]} and ${languages[translationLanguage]}`,
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

    prompt.push(previousMessages[0]);
    promptLength += prompt[0].content.length;

    for (let i = previousMessages.length - 1; i > 1; i = i - 2) {
      prompt.push(previousMessages[i - 1]);
      prompt.push(previousMessages[i]);
      promptLength +=
        previousMessages[i - 1].content.length +
        previousMessages[i].content.length;

      if (
        promptLength >
        promptSettings.maxPromptLength - promptSettings.minExamplesLength
      ) {
        break;
      }
    }
  }

  logger.verbose(
    `📝 Attached messages to prompt: 
${prompt.map((msg) => msg.content).join("\n")}`
  );

  // Find similar translation pairs in the vector store (similarity search) and attach to prompt
  const similarTexts = await getPromptExamples(
    userInput,
    originalLanguage,
    translationLanguage,
    promptSettings.maxPromptLength - promptLength
  );
  const examples =
    similarTexts.length > 0
      ? ", for example,\n" +
        similarTexts.map((pair) => pair[0] + "\n" + pair[1]).join("\n\n")
      : "";

  const command = `Translate from ${languages[originalLanguage]} to ${languages[translationLanguage]}`;

  const promptText = `${command}, make sure to make no grammar or spelling mistakes${examples}:

${userInput}`;

  const newPromptMessage = {
    role: APIRole.User,
    content: promptText,
  };

  prompt.push(newPromptMessage);
  newMessages.push({
    ...newPromptMessage,
    relevantBlockId: block.blockId,
    attachToPrompt: false,
  });

  logger.verbose(
    `📝 Generated prompt message: "${promptText}"
length: ${promptText.length}`
  );

  return [prompt, newMessages];
};
