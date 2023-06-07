import { Block } from "../models/Doc";

import { ChatCompletionRequestMessageRoleEnum as APIRole } from "openai";
import { APIMessage } from "./translation";

const modelSystemRoles = {
  geologyExpert:
    "You have an Ph.D in petroleum geology, fluent in Russian and Vietnamese",
};

const modelPromptTemplates = {
  geologyExpert: {
    translate:
      "Переведи текст отчета по геологии с вьетнамского языка на русский:",
  },
};

export const generatePrompt = (block: Block, history?: Array<APIMessage>) => {
  const newMessages: Array<APIMessage> = [];
  let prompt: Array<APIMessage>;

  if (!history || history?.length === 0) {
    const firstSystemMessage = {
      role: APIRole.System,
      content: modelSystemRoles.geologyExpert,
    };

    prompt = [firstSystemMessage];

    newMessages.push({
      ...firstSystemMessage,
      relevantBlockId: block.blockId,
      attachToPrompt: true,
    });
  } else {
    prompt = history
      .filter((msg) => msg.attachToPrompt)
      .map((msg) => {
        return { role: msg.role, content: msg.content };
      });
  }

  const newPromptMessage = {
    role: APIRole.User,
    content: `${modelPromptTemplates.geologyExpert.translate}
  ${block.text}`,
  };
  prompt.push(newPromptMessage);
  newMessages.push({
    ...newPromptMessage,
    relevantBlockId: block.blockId,
    attachToPrompt: true,
  });

  // console.log("Generated prompt: ", prompt);
  // console.log(
  //   "And generated new outcoming messages for history: ",
  //   newMessages
  // );

  return [prompt, newMessages];
};
