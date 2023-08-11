import { DocxLoader } from "langchain/document_loaders/fs/docx";

import { rawData } from "../../config.js";
import { deleteFileIfExists, writeToExistingOrCreateFile } from "./utils.js";
import { Language } from "../../models/Doc.js";

// Data preparation step
// Parse docx into original and translation paragraphs pairs and save them to csv file
const sourceDocumentPairs: Array<{ vn: string; ru: string }> = [
  {
    vn: "../data/doc_sources/doc1_vn.docx",
    ru: "../data/doc_sources/doc1_ru.docx",
  },
  {
    vn: "../data/doc_sources/BCTL_Rong_VN.docx",
    ru: "../data/doc_sources/BCTL_Rong_RU.docx",
  },
  {
    vn: "../data/doc_sources/Tap I_Tinh lai tru luong Bach Ho 2017_vn.docx",
    ru: "../data/doc_sources/Tap I_Tinh lai tru luong Bach Ho 2017_ru.docx",
  },
  {
    vn: "../data/doc_sources/Bao cao TUMC_14.07.22_VN.docx",
    ru: "../data/doc_sources/Bao cao TUMC_14.07.22_RU.docx",
  },
  {
    vn: "../data/doc_sources/Bao Cao_Nguon goc CO2_V3_vn.docx",
    ru: "../data/doc_sources/Bao Cao_Nguon goc CO2_V3_ru.docx",
  },
];

async function parseWordDocumentSourcesIntoSampleTranslationData(
  listOfPathPairs = sourceDocumentPairs,
  deletePrevious = true
) {
  if (deletePrevious) deleteFileIfExists(rawData);

  listOfPathPairs.forEach((pair) =>
    parseOriginAndTranslationPair(pair.vn, pair.ru)
  );
}

async function parseOriginAndTranslationPair(
  originPath: string,
  translationPath: string,
  originLang = Language.Vn,
  translationLang = Language.Ru
) {
  try {
    const originParagraphs = await parseSourceDocument(originPath);
    const translationParagraphs = await parseSourceDocument(translationPath);

    for (let i = 0; i < originParagraphs.length; i++) {
      const textOrigin = JSON.stringify(originParagraphs[i]?.trim());
      const textTranslation = JSON.stringify(translationParagraphs[i]?.trim());

      // Skip too short or too long paragraphs
      if (textOrigin?.length < 3 || textTranslation?.length < 3) continue;
      if (textOrigin?.length > 1000 || textTranslation?.length > 1000) continue;

      writeToExistingOrCreateFile(
        rawData,
        `${textOrigin},${textTranslation}` + "\n",
        `${originLang},${translationLang}` + "\n"
      );
    }
  } catch (error) {
    console.log("🔥🔥🔥 word-loader error", error);
  }
}

export async function parseSourceDocument(path: string) {
  const loader = new DocxLoader(path);

  const docs = await loader.load();

  const pageContent = docs[0].pageContent;

  const clearedContent = pageContent
    .replace(/[\n\r]+/g, "\n")
    .replaceAll("\t", "")
    .replaceAll('"', "'");

  const paragraphs = clearedContent.split("\n");

  return paragraphs;
}

parseWordDocumentSourcesIntoSampleTranslationData(sourceDocumentPairs, true);
