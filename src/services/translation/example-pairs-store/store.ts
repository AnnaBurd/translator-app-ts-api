import fs from "fs";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { FaissStore } from "langchain/vectorstores/faiss";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";

import { parahraphPairsPath } from "./loader.js";

import logger from "../../../utils/logger.js";
import { Language } from "../../../models/Doc.js";
import e from "express";
import { backOff } from "exponential-backoff";

let vectorStore: FaissStore;
try {
  logger.info(`🚀 Launching vector store`);
  if (!fs.existsSync("../data/vector_store.faiss")) {
    console.log("... Loading source translation pairs ...");
    const loader = new CSVLoader(parahraphPairsPath);
    const docs = await loader.load();

    console.log("... Indexing vector store ...");
    vectorStore = await FaissStore.fromDocuments(docs, new OpenAIEmbeddings());

    console.log("... Saving vector store to file for future use ...");
    await vectorStore.save("../data/vector_store.faiss");
  } else {
    console.log("... Loading vector store from file ...");
    vectorStore = await FaissStore.load(
      "../data/vector_store.faiss",
      new OpenAIEmbeddings()
    );
  }
} catch (err) {
  console.log("🫣 Error loading vector store", err);
  logger.error("🫣 Error loading vector store", err);
}

const getPromptExamples = async (
  prompt: string,
  originalLanguage: Language,
  translationLanguage: Language,
  maxLenght = 2000
) => {
  console.log("📖 Vector store - similarity search", prompt);

  let examples;

  try {
    examples = await backOff(() => vectorStore.similaritySearch(prompt, 5), {
      numOfAttempts: 10,
      startingDelay: 1000 * 20,
      timeMultiple: 2,
      delayFirstAttempt: false,
      retry: (e: any, attemptNumber: number) => {
        if (!e.message.includes("429")) return false;

        console.log(
          "📖 Vector store - retrying attempt",
          attemptNumber,
          e.message
        );
        return true;
      },
    });
  } catch (error) {
    console.log("📖🫣 Error loading examples after exponential backoff", error);
    throw error;
  }

  if (!examples) {
    console.log("📖 Vector store - no results");
    return [];
  }

  console.log("📖 Vector store - results ", examples);

  const examplesForSpecifiedLanguages = [];
  let totalLength = 0;

  for (const example of examples) {
    const vn = example.pageContent.slice(8).split("TRANSLATION: ")[0].trim();
    const ru = example.pageContent.slice(8).split("TRANSLATION: ")[1].trim();

    if (totalLength + vn.length + ru.length >= maxLenght) break;

    totalLength += vn.length + ru.length;
    const pair = originalLanguage === Language.Vn ? [vn, ru] : [ru, vn];
    examplesForSpecifiedLanguages.push(pair);
  }

  return examplesForSpecifiedLanguages;
};

export { getPromptExamples };
