import fs from "fs";
import { CSVLoader } from "langchain/document_loaders/fs/csv";
import { FaissStore } from "langchain/vectorstores/faiss";
import { embeddings } from "./embeddings-local.js";

import logger from "../../utils/logger.js";
import { Language } from "../../models/Doc.js";
import { sampleData, storePath } from "../../config.js";

logger.info("📖 Loading csv dataset of sample translations");
const loaderRu = new CSVLoader(sampleData, Language.Ru);
const loaderVn = new CSVLoader(sampleData, Language.Vn);

const docsRu = await loaderRu.load();
const docsVn = await loaderVn.load();

console.log("docsRu", docsRu.length);
console.log("docsVn", docsVn.length);

logger.info("📖 Launching local vector store");

let vectorStoreVn: FaissStore;
let vectorStoreRu: FaissStore;
try {
  const storeAlreadyExists = fs.existsSync(storePath);

  if (!storeAlreadyExists) {
    logger.info(
      "📖 Indexing vector store (indexation takes time, do not turn off!)"
    );

    vectorStoreVn = await FaissStore.fromDocuments(docsVn, embeddings);
    vectorStoreRu = await FaissStore.fromDocuments(docsRu, embeddings);

    logger.info(`📖 Saving vector store to ${storePath} for future use`);

    await vectorStoreVn.save(`${storePath}/vn`);
    await vectorStoreRu.save(`${storePath}/ru`);
  }

  if (storeAlreadyExists) {
    logger.info(`📖 Loading existing vector store from ${storePath}`);
    vectorStoreVn = await FaissStore.load(`${storePath}/vn`, embeddings);
    vectorStoreRu = await FaissStore.load(`${storePath}/ru`, embeddings);
  }
} catch (err) {
  logger.error("🫣📖 Error loading vector store", err);
}

const getPromptExamples = async (
  prompt: string,
  originalLanguage = Language.Vn,
  translationLanguage = Language.Ru,
  maxLenght = 2000
) => {
  logger.verbose(
    `📖🔍 Local vector store - similarity search for:\n\t • ${prompt} (${originalLanguage} - ${translationLanguage})`
  );

  if (
    !(
      originalLanguage === Language.Vn && translationLanguage === Language.Ru
    ) &&
    !(originalLanguage === Language.Ru && translationLanguage === Language.Vn)
  )
    return []; // Current dataset only has examples with ru-vn pairs

  const store =
    originalLanguage === Language.Vn ? vectorStoreVn : vectorStoreRu;
  const translations = translationLanguage === Language.Vn ? docsVn : docsRu;

  const similarSentenses = await store.similaritySearch(prompt, 8);

  logger.verbose(`📖🔍 Local vector store - similarity search results:
  \t • ${similarSentenses.map((doc) => doc.pageContent).join("\n\t • ")}`);

  if (!similarSentenses) {
    logger.warn("📖🔍 Local vector store - no similar results");
    return [];
  }

  const examplesForSpecifiedLanguages = [];
  let totalLength = 0;

  for (const doc of similarSentenses) {
    const original = doc.pageContent;
    const translation = translations[doc.metadata.line - 1].pageContent;

    if (totalLength + original.length + translation.length >= maxLenght) break;

    totalLength += original.length + translation.length;

    examplesForSpecifiedLanguages.push([original, translation]);
  }

  return examplesForSpecifiedLanguages;
};

export { getPromptExamples };
