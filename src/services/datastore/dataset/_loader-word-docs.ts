/* Parse word documents into original and translation paragraphs pairs and save them to csv file */

import { deleteFileIfExists, writeToExistingOrCreateFile } from "../utils.js";
import { Language } from "../../../models/Doc.js";
import { loadDocxDocumentContent } from "./_loadDocxDocumentContent.js";
import {
  SourceDocumentPair,
  sourceDocumentPairs,
} from "./_data-sources-list.js";
import { rawData as outputCSVFilePath } from "../../../config.js";
const rewriteOutputFile = true;

// 1. Data preparation step
// Parse docx into original and translation paragraphs pairs and save them to csv file under path outputCSVFilePath, optionally delete previous file

// 2. Manual step - verify correctness of the data in the csv file, correct if needed, copy to the _checked csv dataset file, which will be used for training / vectorization
// !!! IMPORTANT !!! - DO NOT DELETE _checked csv file, it contains manually corrected data

const parseDocxDocumentPairsToCSV = async (
  docPairs: SourceDocumentPair[],
  rewrite = true
) => {
  if (rewrite) deleteFileIfExists(outputCSVFilePath);

  const selectParagraphPairs = (
    paragraphsOriginal: string[],
    paragraphsTranslation: string[]
  ): [string[], string[]] => {
    const selectedOriginParagraphs: string[] = [];
    const selectedTranslationParagraphs: string[] = [];

    for (
      let i = 0, j = 0;
      i < paragraphsOriginal.length, j < paragraphsTranslation.length;
      i++, j++
    ) {
      let textOrigin = JSON.stringify(paragraphsOriginal[i]?.trim());
      let textTranslation = JSON.stringify(paragraphsTranslation[j]?.trim());

      // console.log(
      //   "i: ",
      //   i,
      //   "j: ",
      //   j,
      //   "textOrigin: ",
      //   textOrigin,
      //   "textTranslation: ",
      //   textTranslation,
      //   "/n"
      // );

      // Skip too short or too long paragraphs
      while (
        i < paragraphsOriginal.length &&
        ((textOrigin?.length < 7 &&
          !textOrigin?.toLowerCase()?.includes("âm") &&
          !textOrigin?.toLowerCase()?.includes("tím")) ||
          textOrigin?.length > 1000 ||
          !isNaN(Number(textOrigin)))
      ) {
        i++;
        textOrigin = JSON.stringify(paragraphsOriginal[i]?.trim());
      }

      while (
        j < paragraphsTranslation.length &&
        ((textTranslation?.length < 7 &&
          !textTranslation?.toLowerCase()?.includes("цвет") &&
          !textTranslation?.toLowerCase()?.includes("шлам")) ||
          textTranslation?.length > 1000 ||
          !isNaN(Number(textTranslation)))
      ) {
        j++;
        textTranslation = JSON.stringify(paragraphsTranslation[j]?.trim());
      }

      if (i >= paragraphsOriginal.length || j >= paragraphsTranslation.length)
        break;

      selectedOriginParagraphs.push(textOrigin);
      selectedTranslationParagraphs.push(textTranslation);
    }

    return [selectedOriginParagraphs, selectedTranslationParagraphs];
  };

  for (const pair of docPairs) {
    console.log("\nparsing documents pair: ", pair.vn, "\n", pair.ru, ":\n");

    try {
      // Get paragraphs from the documents
      const originParagraphs = await loadDocxDocumentContent(pair.vn);
      const translationParagraphs = await loadDocxDocumentContent(pair.ru);

      console.log("originParagraphs: ", originParagraphs.length);
      console.log("translationParagraphs: ", translationParagraphs.length);

      // Select pairs of paragraphs suitable for vector storage
      const [selectedOriginParagraphs, selectedTranslationParagraphs] =
        selectParagraphPairs(originParagraphs, translationParagraphs);

      console.log(
        "selectedOriginParagraphs: ",
        selectedOriginParagraphs.length
      );
      console.log(
        "selectedTranslationParagraphs: ",
        selectedTranslationParagraphs.length
      );

      // Save selected pairs to csv file
      const outputHeader = `${Language.Vn},${Language.Ru}` + "\n";
      let outputContent = "";
      for (let i = 0; i < selectedOriginParagraphs.length; i++) {
        outputContent +=
          `${selectedOriginParagraphs[i]},${selectedTranslationParagraphs[i]}` +
          "\n";
      }
      writeToExistingOrCreateFile(
        outputCSVFilePath,
        outputContent,
        outputHeader
      );
    } catch (error) {
      console.log("🔥🔥🔥 word-loader: error parsing documents pair", error);
    }
  }
};

// Call the function to parse docx files into csv
parseDocxDocumentPairsToCSV(sourceDocumentPairs, rewriteOutputFile);
