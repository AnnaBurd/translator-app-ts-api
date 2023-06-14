import { RequestHandler } from "express";
import { HydratedDocument } from "mongoose";

import Doc, { IDoc, Block } from "../models/Doc";
import { translateBlock } from "../services/translation";
import User, { IUser } from "../models/User";

import logger from "../utils/logger";

export const createNewDocument: RequestHandler = async (req, res, next) => {
  try {
    // Save new document to database
    const newDocument = await new Doc({
      owner: req.currentUserId,
      title: req.body.title,
      lang: req.body.language,
    }).save();

    res.status(201).json({ status: "success", doc: newDocument });
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
    const userDocuments = await Doc.find({ owner: req.currentUserId });

    res.status(200).json({ status: "success", docs: userDocuments });
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

    res.status(200).json({ status: "success", doc });
  } catch (error) {
    next(error);
  }
};

export const addNewBlockToTranslate: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    // Get input data
    const doc = await getUserDocument(req.currentUserId!, req.params.docId);
    const newBlock: Block = req.body.block;

    // Call translation service
    const [translatedNewBlock, newMessages] = await translateBlock(
      newBlock,
      doc.messagesHistory
    );

    // Save results and history to the database
    doc.content.push(newBlock);
    doc.translationContent.push(translatedNewBlock);
    doc.messagesHistory.push(...newMessages);
    await doc?.save();

    // Send results back to user
    res.status(200).json({
      status: "success",
      data: doc.translationContent[doc.translationContent.length - 1],
    });
  } catch (error) {
    next(error);
  }
};

// export const editUserDocument: RequestHandler = async (req, res, next) => {
//   try {
//     const doc = await getUserDocument(req.currentUser!, req.params.docId);

//     res.status(200).json({ status: "success", doc });
//   } catch (error) {
//     next(error);
//   }
// };
