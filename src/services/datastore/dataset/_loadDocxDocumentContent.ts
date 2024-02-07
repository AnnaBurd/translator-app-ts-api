import { DocxLoader } from "langchain/document_loaders/fs/docx";

export async function loadDocxDocumentContent(path: string) {
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
