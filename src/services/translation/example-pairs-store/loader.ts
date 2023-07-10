import fs from "fs";
import { DocxLoader } from "langchain/document_loaders/fs/docx";

// Data preparation step
// Parse docx into original and translation paragraphs pairs and save them to csv file
const sourceDocumentPairs = [
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
];
const parahraphPairsPath = "../data/paragraphs.csv";
async function parseSourceDocuments(
  listOfPathPairs = sourceDocumentPairs,
  deletePrevious = true
) {
  if (deletePrevious) clearParagraphsSource();

  listOfPathPairs.forEach((pair) => parseSourceDocumentPair(pair.vn, pair.ru));
}

async function parseSourceDocumentPair(
  originPath: string,
  translationPath: string
) {
  try {
    const originParagraphs = await parseSourceDocument(originPath);
    const translationParagraphs = await parseSourceDocument(translationPath);

    for (let i = 0; i < originParagraphs.length; i++) {
      const textOrigin = JSON.stringify(originParagraphs[i].trim());
      const textTranslation = JSON.stringify(translationParagraphs[i].trim());

      // Skip too short or too long paragraphs
      if (textOrigin.length < 3 || textTranslation.length < 3) continue;
      if (textOrigin.length > 1000 || textTranslation.length > 1000) continue;

      writeToExistingOrCreateFile(
        parahraphPairsPath,
        `${textOrigin},${textTranslation}` + "\n",
        `${"ORIGIN"},${"TRANSLATION"}` + "\n"
      );
    }
  } catch (error) {
    console.log("🔥🔥🔥", error);
  }
}

async function parseSourceDocument(path: string) {
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

function clearParagraphsSource() {
  deleteFileIfExists(parahraphPairsPath);
}
function deleteFileIfExists(filePath: string) {
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    console.log("file was already deleted", err);
  }
}
function writeToExistingOrCreateFile(
  filePath: string,
  data: string,
  header: string = ""
) {
  try {
    // Check if the file exists
    fs.accessSync(filePath, fs.constants.F_OK);

    // File exists, append the data
    fs.appendFileSync(filePath, data, { encoding: "utf8", mode: 0o666 });
  } catch (error) {
    // File doesn't exist, create it and write the data
    fs.writeFileSync(filePath, header, {
      encoding: "utf8",
    });
    fs.appendFileSync(filePath, data, { encoding: "utf8" });
  }
}

export { parseSourceDocuments, parahraphPairsPath };
