import { Block, Language } from "../../models/Doc.js";

import { ChatCompletionRequestMessageRoleEnum as APIRole } from "openai";
import { APIMessage, EditOption } from "./translation.js";
import { getPromptExamples } from "./example-pairs-store/store.js";

const modelSystemRoles = {
  geologyExpert: "You have an Ph.D in petroleum geology",
};

const languages = {
  ru: "Russian",
  vn: "Vietnamese",
  en: "English",
};

const modelPromptTemplates = {};

export const generatePrompt = async (
  block: Block,
  history?: Array<APIMessage>,
  options?: {
    originalLanguage?: Language;
    targetLanguage?: Language;
    type?: EditOption;
  }
) => {
  console.log("✍🏻 Generate prompt: ", block);
  const newMessages: Array<APIMessage> = [];
  let prompt: Array<APIMessage>;

  const originalLanguage =
    (options?.originalLanguage as Language) || Language.Vn;
  const translationLanguage =
    (options?.targetLanguage as Language) || Language.Ru;

  if (!history || history?.length === 0) {
    const firstSystemMessage = {
      role: APIRole.System,
      content:
        modelSystemRoles.geologyExpert +
        `, fluent in ${languages[originalLanguage]} and ${languages[translationLanguage]}`,
    };

    prompt = [firstSystemMessage];

    newMessages.push({
      ...firstSystemMessage,
      attachToPrompt: true,
    });
  } else {
    prompt = history
      .filter((msg) => msg.attachToPrompt)
      .map((msg) => {
        return { role: msg.role, content: msg.content };
      });
  }

  // TODO: if user input is too long split on blocks
  const userInput = block.text;
  console.log("✍🏻 User input: ", userInput);
  const similarTexts = await getPromptExamples(
    userInput,
    originalLanguage,
    translationLanguage,
    4000 - userInput.length * 2
  );

  console.log("✍🏻 Similar texts: ", similarTexts);

  // console.log("similarTexts: ", similarTexts);

  const promptText = `Translate from ${languages[originalLanguage]} to ${
    languages[translationLanguage]
  }, make sure to make no grammar or spelling mistakes${
    similarTexts.length > 0
      ? `, for example,
  ${similarTexts.map((pair) => pair[0] + "\n" + pair[1]).join("\n\n")}`
      : ""
  }:

${userInput}`;

  console.log("GENERATED Prompt text: ", promptText);

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

  // console.log("Generated prompt: ", prompt);
  // console.log(
  //   "And generated new outcoming messages for history: ",
  //   newMessages
  // );

  console.log("PROMPT LENGHT: 🎈🔥🎈", JSON.stringify(prompt).length);

  return [prompt, newMessages];
};
