// import { DocxLoader } from "langchain/document_loaders/fs/docx";

// import { parseSourceDocument } from "./_loader-word-docs.js";

// import { deleteFileIfExists, writeToExistingOrCreateFile } from "../utils.js";

// // Data preparation step
// // Parse docx file into paragraphs and save them to csv file
// const src = "../data/doc_sources/Bao Cao_Nguon goc CO2_V3_vn.docx";
// const src_lang = "vn";
// const parahraphsPath = "../data/source_to_translate.csv";

// async function parseNewOriginDocuments(
//   listOfSources = [{ path: src, lang: src_lang }],
//   deletePrevious = true
// ) {
//   if (deletePrevious) deleteFileIfExists(parahraphsPath);

//   listOfSources.forEach((source) =>
//     parseSourceDocumentIntoParagraphs(source.path, source.lang)
//   );
// }

// async function parseSourceDocumentIntoParagraphs(
//   originPath: string,
//   originLang: string
// ) {
//   try {
//     const originParagraphs = await parseSourceDocument(originPath);

//     for (let i = 0; i < originParagraphs.length; i++) {
//       const textOrigin = originParagraphs[i]
//         .trim()
//         .replaceAll('"', "'")
//         .replaceAll("\t", "")
//         .replaceAll("\n", " ")
//         .replaceAll(". ", ".\n");

//       // Skip too short paragraphs
//       if (textOrigin.length < 3) continue;

//       writeToExistingOrCreateFile(parahraphsPath, `${textOrigin}` + "\n");
//     }
//   } catch (error) {
//     console.log("🔥🔥🔥 _loader-new-doc", error);
//   }
// }

// export { parseNewOriginDocuments, parahraphsPath };
