import { CreateCompletionResponseUsage } from "openai";
import { APIMessage } from "./translation.js";
import logger from "../../utils/logger.js";

// Imitate api requests for tests
export const fetchAPIResponseFake = async (
  prompt: Array<APIMessage>
): Promise<[string, CreateCompletionResponseUsage]> => {
  try {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(console.log("Recieved API RESPONSE"));
      }, 1000);
    });

    return [
      `Dummy translation: ${prompt[prompt.length - 1].content.split(":")[1]}`,
      { total_tokens: 10, completion_tokens: 5, prompt_tokens: 5 },
    ];
  } catch (error) {
    console.log(error);
    logger.error(`Could not fetch data from API: ${error}`);
    throw error;
  }
};
