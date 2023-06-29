import e, { RequestHandler } from "express";
import Doc, { Block } from "../models/Doc.js";
import {
  TranslationOption,
  translateBlockContent,
} from "../services/translation.js";

import logger from "../utils/logger.js";

export const createNewDocument: RequestHandler = async (req, res, next) => {
  try {
    // Validate data
    // TODO: reuse yup schema?

    const newdocdata = {
      title: req.body.title,
      lang: req.body.lang,
      translationLang: req.body.translationLang,
      owner: req.currentUserId,
    };

    // Save new document to database
    const newDocument = await new Doc(newdocdata).save();

    res.status(201).json({ status: "success", data: newDocument });
  } catch (error) {
    logger.error(
      `🔥 Could not create new document. (${(error as Error).message}`
    );
    next(error);
  }
};

export const getUserDocuments: RequestHandler = async (req, res, next) => {
  try {
    // TODO: filter
    // TODO: filter only relevant data
    // TODO: pagination
    const userDocuments = await Doc.find({ owner: req.currentUserId });

    // Generate output including doc text preview strings
    const data = userDocuments.map((doc) => {
      return {
        _id: doc._id,
        title: doc.title,
        lang: doc.lang,
        translationLang: doc.translationLang,
        changedAt: doc.changedAt,
        textPreview: doc.content[0]?.text.slice(0, 200) || "",
        translationPreview: doc.translationContent[0]?.text.slice(0, 200) || "",
      };
    });

    res.status(200).json({ status: "success", data });
  } catch (error) {
    logger.error(
      `🔥 Could not get user's documents. (${(error as Error).message}`
    );
    next(error);
  }
};

const getUserDocument = async (ownerId: string, docId: string) => {
  // Fetch document from database and make dure that requested document belongs to user
  const doc = await Doc.findById(docId);
  if (!doc || !(doc.owner.toString() === ownerId))
    throw new Error(
      "Could not get a document, it could have been already deleted"
    );

  return doc;
};

export const readUserDocument: RequestHandler = async (req, res, next) => {
  try {
    const doc = await getUserDocument(req.currentUserId!, req.params.docId);

    res.status(200).json({ status: "success", data: doc });
  } catch (error) {
    next(error);
  }
};

// export const addNewBlockToTranslate: RequestHandler = async (
//   req,
//   res,
//   next
// ) => {
//   try {
//     // Get input data
//     const doc = await getUserDocument(req.currentUserId!, req.params.docId);
//     const newBlock: Block = req.body.block;
//     const blockIndex: number =
//       req.body.blockPositionIndex || doc.content.length;

//     // Call translation service
//     const [translatedNewBlock, newMessages] = await translateBlockContent(
//       newBlock,
//       doc.messagesHistory,
//       {
//         originalLanguage: doc.lang,
//         targetLanguage: doc.translationLang,
//         type: TranslationOption.newOriginalBlock,
//       }
//     );

//     // Save results and history to the database
//     doc.content.splice(blockIndex, 0, newBlock);
//     doc.translationContent.splice(blockIndex, 0, translatedNewBlock);
//     doc.messagesHistory.push(...newMessages);
//     await doc?.save();

//     // Send results back to user
//     res.status(200).json({
//       status: "success",
//       data: doc.translationContent[blockIndex],
//     });
//   } catch (error) {
//     next(error);
//   }
// };

export const editUserDocument: RequestHandler = async (req, res, next) => {
  try {
    // Get requested document from the database
    const doc = await getUserDocument(req.currentUserId!, req.params.docId);

    console.log(
      "editUserDocument",
      req.body.block,
      req.body.editOption,
      req.body.blockPositionIndex
    );

    // Get input data
    const inputBlock: Block = req.body.block;
    const editOption: TranslationOption =
      req.body.translationOption || TranslationOption.newOriginalBlock;
    const inputBlockIndex: number =
      editOption === TranslationOption.newOriginalBlock
        ? req.body.blockPositionIndex ?? doc.content.length - 1
        : doc.content.findIndex(
            (block) => block.blockId === inputBlock.blockId
          );

    if (inputBlockIndex === -1) throw new Error("Block not found");

    console.log("inputBlock", inputBlock);
    console.log("editOption", editOption);
    console.log("inputBlockIndex", inputBlockIndex);

    if (
      editOption === TranslationOption.newOriginalBlock ||
      editOption === TranslationOption.editOriginalBlock
    ) {
      // Update translation after original text was changed
      const [translatedBlock, newMessages] = await translateBlockContent(
        inputBlock,
        doc.messagesHistory,
        {
          originalLanguage: doc.lang,
          targetLanguage: doc.translationLang,
          type: editOption,
        }
      );

      // Save results and history to the database

      doc.content.splice(
        inputBlockIndex,
        editOption === TranslationOption.newOriginalBlock ? 0 : 1,
        inputBlock
      );
      doc.translationContent.splice(
        inputBlockIndex,
        editOption === TranslationOption.newOriginalBlock ? 0 : 1,
        translatedBlock
      );

      if (editOption !== TranslationOption.newOriginalBlock) {
        doc.messagesHistory.forEach((message) => {
          if (message.relevantBlockId === inputBlock.blockId) {
            message.attachToPrompt = false;
          }
        });
      }

      doc.messagesHistory.push(...newMessages);

      await doc?.save();

      // Send results back to user
      return res.status(200).json({
        status: "success",
        data: translatedBlock,
      });
    }

    res.status(500).json({ "not implemented": "yet" });
  } catch (error) {
    next(error);
  }
};

export const deleteUserDocument: RequestHandler = async (req, res, next) => {
  try {
    const ownerId = req.currentUserId!;
    const docId = req.params.docId;

    await Doc.deleteOne({ _id: docId, owner: ownerId });

    res.status(204).json({ status: "success" });
  } catch (error) {
    next(error);
  }
};
