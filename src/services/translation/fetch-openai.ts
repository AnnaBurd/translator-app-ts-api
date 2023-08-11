import { backOff } from "exponential-backoff";
import {
  OpenAIApi,
  Configuration,
  CreateCompletionResponseUsage,
} from "openai";
import { AI_KEY } from "../../config.js";
import { AppError, AppErrorName } from "../../middlewares/errorHandler.js";
import logger from "../../utils/logger.js";
import { modelSettings } from "./translation.config.js";
import { APIMessage } from "./translation.js";

const openai = new OpenAIApi(new Configuration({ apiKey: AI_KEY }));

export const fetchAPIResponse = async (
  prompt: Array<APIMessage>
): Promise<[string, CreateCompletionResponseUsage]> => {
  let response;

  logger.verbose("🧌  Fetching data from Open AI API");

  const fetchAPIResponse = () =>
    openai.createChatCompletion({
      ...modelSettings,
      messages: prompt,
    });

  const onBackOffRetry = (e: any, attemptNumber: number) => {
    logger.error(`🧌🌋  Error Fetching data from Open AI API: ${e.message}`);
    if (
      !e.message.includes("429") &&
      !e.message.includes("503") &&
      !e.message.includes("404") &&
      !e.message.includes("502")
    )
      return false;

    logger.verbose(
      `🧌🌋  Fetching data from Open AI API - retrying attempt ${attemptNumber} (${e.message})`
    );

    return true;
  };

  const backOffOptions = {
    numOfAttempts: 10,
    startingDelay: 1000 * 20,
    timeMultiple: 2,
    delayFirstAttempt: false,
    retry: onBackOffRetry,
  };

  try {
    response = await backOff(fetchAPIResponse, backOffOptions);
  } catch (error) {
    throw new AppError(
      AppErrorName.ApiError,
      "🧌🌋  Error fetching translation from Open AI API"
    );
  }

  if (response.status !== 200)
    throw new AppError(
      AppErrorName.ApiError,
      `🧌🌋  Open AI API refused request: ${response.status} ${response.statusText}`
    );

  // Usage statistics
  const usage = response?.data?.usage;
  logger.verbose(
    `🧌  Open AI API usage: ${usage?.prompt_tokens} + ${usage?.completion_tokens} = ${usage?.total_tokens}`
  );

  // Completion data
  const completion = response?.data?.choices[0]?.message?.content;

  if (!completion)
    throw new AppError(
      AppErrorName.ApiError,
      "🧌🌋 No completion from OPEN AI API"
    );

  if (!usage) {
    logger.info(`No usage statistics from OPEN AI API: ${completion}`);
  }

  return [
    completion,
    usage || { total_tokens: 0, completion_tokens: 0, prompt_tokens: 0 },
  ];
};
