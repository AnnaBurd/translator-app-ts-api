import { Block, Language } from "../models/Doc";

import { ChatCompletionRequestMessageRoleEnum as APIRole } from "openai";
import { APIMessage, TranslationOption } from "./translation";

const modelSystemRoles = {
  geologyExpert: "You have an Ph.D in petroleum geology",
};

const languages = {
  ru: "Russian",
  vn: "Vietnamese",
  en: "English",
};

const modelPromptTemplates = {
  geologyExpert: {
    translate: {
      ru: {
        vn: "Переведи текст отчета по геологии с русского языка на вьетнамский:",
        en: "Переведи текст отчета по геологии с русского языка на английский:",
      },
      en: {
        vn: "Translate the geology report from English to Vietnamese:",
        ru: "Translate the geology report from English to Russian:",
      },
      vn: {
        ru: "Переведи текст отчета по геологии с вьетнамского языка на русский:",
        en: "Переведи текст отчета по геологии с вьетнамского языка на английский:",
      },
    },
  },
};

export const generatePrompt = (
  block: Block,
  history?: Array<APIMessage>,
  options?: {
    originalLanguage?: Language;
    targetLanguage?: Language;
    type?: TranslationOption;
  }
) => {
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
    content: `${
      (modelPromptTemplates.geologyExpert.translate[originalLanguage] as any)[
        translationLanguage
      ]
    }
  ${block.text}`,
  };

  prompt.push(newPromptMessage);
  newMessages.push({
    ...newPromptMessage,
    relevantBlockId: block.blockId,
    attachToPrompt: true,
  });

  console.log("Generated prompt: ", prompt);
  console.log(
    "And generated new outcoming messages for history: ",
    newMessages
  );

  console.log("PROMPT LENGHT: 🎈🔥🎈", JSON.stringify(prompt).length);

  return [prompt, newMessages];
};
