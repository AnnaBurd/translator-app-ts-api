import { RequestHandler } from "express";
import { HydratedDocument } from "mongoose";

import Doc, { IDoc, Block } from "../models/Doc";
import { translateBlock } from "../services/translation";
import User, { IUser } from "../models/User";

import logger from "../utils/logger";

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
        textPreview: doc.content[0]?.text.slice(0, 30) || "",
        translationPreview: doc.translationContent[0]?.text.slice(0, 50) || "",
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

export const addNewBlockToTranslate: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    // Get input data
    const doc = await getUserDocument(req.currentUserId!, req.params.docId);
    const newBlock: Block = req.body.block;

    console.log(req.body);

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
