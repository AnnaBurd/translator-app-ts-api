import { Block } from "../models/Doc";
import { APIMessage } from "../models/Translation";

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
  console.log("Generating Prompt for ", block, history);

  let previousAPIMessagesToAttach;
  if (history) {
    previousAPIMessagesToAttach = history;
  } else {
    previousAPIMessagesToAttach = [
      { role: "system", content: modelSystemRoles.geologyExpert },
    ];
  }
};
