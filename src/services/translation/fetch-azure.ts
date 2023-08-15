import { backOff } from "exponential-backoff";
// import {
//   OpenAIApi,
//   Configuration,
//   CreateCompletionResponseUsage,
// } from "openai";

import {
  OpenAIClient,
  AzureKeyCredential,
  ChatCompletions,
} from "@azure/openai";

import {
  AZURE_OPENAI_KEY,
  AZURE_MODEL_DEPLOYMENT_NAME,
  AZURE_OPENAI_ENDPOINT,
} from "../../config.js";
import { AppError, AppErrorName } from "../../middlewares/errorHandler.js";
import logger from "../../utils/logger.js";
import { modelSettings } from "./translation.config.js";
import { APIMessage } from "./translation.js";
import { CreateCompletionResponseUsage } from "openai";

const openaiClient = new OpenAIClient(
  AZURE_OPENAI_ENDPOINT as string,
  new AzureKeyCredential(AZURE_OPENAI_KEY as string)
);

const deploymentId = AZURE_MODEL_DEPLOYMENT_NAME as string;

export const fetchAPIResponse = async (
  prompt: Array<APIMessage>
): Promise<[string, CreateCompletionResponseUsage]> => {
  let response;

  logger.verbose("🧌  Fetching data from AZURE API");

  const fetchAPIResponse = () =>
    openaiClient.getChatCompletions(deploymentId, prompt, modelSettings);

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
    response = await backOff<ChatCompletions>(fetchAPIResponse, backOffOptions);
    console.log("GOT RESPONSE FROM AZURE MODEL", response);
  } catch (error) {
    console.log(error);

    throw new AppError(
      AppErrorName.ApiError,
      "🧌🌋  Error fetching translation from Open AI API"
    );
  }

  // Usage statistics
  const usage = response?.usage;
  logger.verbose(
    `🧌  Open AI API usage: ${usage?.promptTokens} + ${usage?.completionTokens} = ${usage?.totalTokens}`
  );

  // Completion data
  const completion = response?.choices[0]?.message?.content;

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
    usage
      ? {
          total_tokens: usage.totalTokens,
          completion_tokens: usage.completionTokens,
          prompt_tokens: usage.promptTokens,
        }
      : { total_tokens: 0, completion_tokens: 0, prompt_tokens: 0 },
  ];
};
