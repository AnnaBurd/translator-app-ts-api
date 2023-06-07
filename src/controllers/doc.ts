import { RequestHandler } from "express";
import { HydratedDocument } from "mongoose";

import Doc, { IDoc, Block } from "../models/Doc";
import { translateBlock } from "../services/translation";
import { IUser } from "../models/User";

import logger from "../utils/logger";

export const createNewDocument: RequestHandler = async (req, res, next) => {
  try {
    const currentUser = req.currentUser!;

    // Save new document to database
    const newDocument = await new Doc({
      title: req.body.title,
      lang: req.body.language,
    }).save();

    // Update list of user's documents
    currentUser.docs.push(newDocument);
    await currentUser.save({ validateBeforeSave: false });

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
    const currentUser = req.currentUser!;

    await currentUser.populate({
      path: "docs",
      select: "title lang createdAt changedAt",
    });

    res.status(200).json({ status: "success", docs: currentUser.docs });
  } catch (error) {
    logger.error(
      `🔥 Could not get user's documents. (${(error as Error).message}`
    );
    next(error);
  }
};

const getUserDocument = async (user: IUser, docId: string) => {
  console.log(user);

  // Make dure that requested document belongs to user
  if (
    !user.docs.some(
      (doc) => (doc as HydratedDocument<IDoc>)._id.toString() === docId
    )
  )
    throw new Error("You have no such document");

  // Fetch document from database
  const doc = await Doc.findById(docId);
  if (!doc)
    throw new Error(
      "Could not get a document, it could have been already deleted"
    );
  return doc;
};

export const readUserDocument: RequestHandler = async (req, res, next) => {
  try {
    const doc = await getUserDocument(req.currentUser!, req.params.docId);

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
    const doc = await getUserDocument(req.currentUser!, req.params.docId);
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
