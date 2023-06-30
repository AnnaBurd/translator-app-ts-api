import e, { RequestHandler } from "express";
import Doc, { Block } from "../models/Doc.js";
import { EditOption, translateBlockContent } from "../services/translation.js";

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

export const editUserDocument: RequestHandler = async (req, res, next) => {
  try {
    // Get requested document from the database
    const doc = await getUserDocument(req.currentUserId!, req.params.docId);

    console.log(
      " ✍🏻✍🏻✍🏻editUserDocument",
      req.body.block,
      req.body.editOption,
      req.body.blockPositionIndex
    );

    const editOption: EditOption =
      req.body.translationOption || EditOption.newOriginalBlock;

    // console.log("inputBlock", inputBlock);
    // console.log("editOption", editOption);
    // console.log("inputBlockIndex", inputBlockIndex);

    if (
      editOption === EditOption.newOriginalBlock ||
      editOption === EditOption.editOriginalBlock
    ) {
      // Get input data
      const inputBlock: Block = req.body.block;

      // Make sure that block length is acceptable, even though on the frontend block length is limited
      if (inputBlock.text.length > 3000)
        inputBlock.text = inputBlock.text.slice(0, 3000);

      const inputBlockIndex: number =
        editOption === EditOption.newOriginalBlock
          ? req.body.blockPositionIndex ?? doc.content.length
          : doc.content.findIndex(
              (block) => block.blockId === inputBlock.blockId
            );

      if (inputBlockIndex === -1) throw new Error("Block not found");

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
        editOption === EditOption.newOriginalBlock ? 0 : 1,
        inputBlock
      );
      doc.translationContent.splice(
        inputBlockIndex,
        editOption === EditOption.newOriginalBlock ? 0 : 1,
        translatedBlock
      );

      if (editOption !== EditOption.newOriginalBlock) {
        doc.messagesHistory.forEach((message) => {
          if (
            message.attachToPrompt &&
            message.relevantBlockId === inputBlock.blockId
          ) {
            message.attachToPrompt = false;
          }
        });
      }

      doc.messagesHistory.push(...newMessages);

      doc.tokensUsed += newMessages.reduce((sum, msg) => {
        return msg.tokens ? sum + msg.tokens : sum;
      }, 0);

      await doc?.save();

      // Send results back to user
      return res.status(200).json({
        status: "success",
        data: translatedBlock,
      });
    }

    if (editOption === EditOption.removeBlocks) {
      const blockIds = req.body.blockIds as string[];

      doc.content = doc.content.filter(
        (block) => !blockIds.includes(block.blockId)
      );
      doc.translationContent = doc.translationContent.filter(
        (block) => !blockIds.includes(block.blockId)
      );

      await doc.save();
    }

    res.status(400).json({
      status: "failure",
      message: `Invalid edit option. Valid options are: ${Object.keys(
        EditOption
      )}`,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteUserDocument: RequestHandler = async (req, res, next) => {
  try {
    const ownerId = req.currentUserId!;
    const docId = req.params.docId;

    await Doc.deleteOne({ _id: docId, owner: ownerId });

    res.status(204).json({ status: "success", data: "deleted" });
  } catch (error) {
    next(error);
  }
};
