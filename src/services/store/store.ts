import fs from "fs";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { FaissStore } from "langchain/vectorstores/faiss";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

import { sampleData } from "./config.js";

import logger from "../../utils/logger.js";
import { Language } from "../../models/Doc.js";
import { backOff } from "exponential-backoff";

const storePath = "../data/vector_store.faiss";

logger.info("📖 Launching vector store");
let vectorStore: FaissStore;
try {
  const storeAlreadyExists = fs.existsSync(storePath);
  const embeddings = new OpenAIEmbeddings();

  if (!storeAlreadyExists) {
    logger.info("📖 Loading csv dataset of sample translations");
    const loader = new CSVLoader(sampleData);
    const docs = await loader.load();

    logger.info(
      "📖 Indexing vector store (indexation takes time, do not turn off!) ..."
    );
    vectorStore = await FaissStore.fromDocuments(docs, embeddings);

    logger.info(`📖 Saving vector store to ${storePath} for future use ...`);
    await vectorStore.save(storePath);
  }

  if (storeAlreadyExists) {
    logger.info(`📖 Loading vector store from ${storePath} ...`);
    vectorStore = await FaissStore.load(storePath, embeddings);
  }
} catch (err) {
  logger.error("🫣📖 Error loading vector store", err);
}

const getPromptExamples = async (
  prompt: string,
  originalLanguage: Language,
  translationLanguage: Language,
  maxLenght = 2000
) => {
  logger.verbose(
    `📖🔍 Vector store - similarity search: ${prompt} (${originalLanguage} - ${translationLanguage})`
  );

  if (
    !(
      originalLanguage === Language.Vn && translationLanguage === Language.Ru
    ) &&
    !(originalLanguage === Language.Ru && translationLanguage === Language.Vn)
  )
    return []; // Current dataset only has examples with ru-vn pairs

  let examples;

  try {
    examples = await backOff(() => vectorStore.similaritySearch(prompt, 5), {
      numOfAttempts: 10,
      startingDelay: 1000 * 20,
      timeMultiple: 2,
      delayFirstAttempt: false,
      retry: (e: any, attemptNumber: number) => {
        if (!e.message.includes("429")) return false;

        logger.verbose(
          `📖🔍 Vector store - similarity search: retrying attempt ${attemptNumber} (${e.message})`
        );
        return true;
      },
    });
  } catch (error) {
    logger.error(
      "📖🔍🔥 Vector store - Error loading examples after exponential backoff"
    );

    return [];
  }

  if (!examples) {
    logger.verbose("📖🔍 Vector store - no similar results");
    return [];
  }

  const examplesForSpecifiedLanguages = [];
  let totalLength = 0;

  for (const example of examples) {
    const vn = example.pageContent.slice(4).split("ru: ")[0].trim();
    const ru = example.pageContent.slice(4).split("ru: ")[1].trim();

    if (totalLength + vn.length + ru.length >= maxLenght) break;

    totalLength += vn.length + ru.length;
    const pair = originalLanguage === Language.Vn ? [vn, ru] : [ru, vn];
    examplesForSpecifiedLanguages.push(pair);
  }

  return examplesForSpecifiedLanguages;
};

export { getPromptExamples };
