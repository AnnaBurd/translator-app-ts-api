import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

import Doc, { IDoc } from "../models/Doc";
import { IUser } from "../models/User";

import { translateBlock } from "../utils/translator";
import {
  sendSuccessMessage,
  sendErrorMessage,
} from "../utils/response-handlers";
import logger from "../utils/logger";

export const getUserDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.verbose(
    `Getting list of documents for user: ${req.currentUser?.email}`
  );

  try {
    const currentUser = req.currentUser as IUser;

    await currentUser.populate({
      path: "docs",
      select: "title lang createdAt changedAt",
    });

    sendSuccessMessage(res, StatusCodes.OK, currentUser.docs, true);
  } catch (error) {
    logger.error(
      `🔥 Could not get user's documents. (${(error as Error).message}`
    );
    sendErrorMessage(res, StatusCodes.NOT_FOUND, error);
  }
};

export const createNewDoc = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.verbose(
    `User ${req.currentUser?.email} creates new document ${req.body.title}`
  );

  try {
    const title = req.body.title;
    const lang = req.body.lang;
    const currentUser = req.currentUser as IUser;

    const newDoc = await Doc.create({ title, lang, owner: currentUser._id });
    currentUser.docs.push(newDoc);
    await currentUser.save({ validateBeforeSave: false }); // Update list of user's documents

    sendSuccessMessage(res, StatusCodes.CREATED, newDoc);
  } catch (error) {
    logger.error(
      `🔥 Could not create new document. (${(error as Error).message}`
    );
    sendErrorMessage(res, StatusCodes.BAD_REQUEST, error);
  }
};

const getUserDocument = async (user: IUser, docId: string): Promise<IDoc> => {
  const doc = await Doc.findById(docId);

  if (!doc || !doc.owner === user._id) {
    throw new Error("Document not found");
  }

  return doc;
};

export const getDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.verbose(
    `User ${req.currentUser?.email} opens document ${req.params.id}`
  );

  try {
    const doc = await getUserDocument(req.currentUser as IUser, req.params.id);

    sendSuccessMessage(res, StatusCodes.OK, doc);
  } catch (error) {
    logger.error(`🔥 Could not open document. (${(error as Error).message})`);
    sendErrorMessage(res, StatusCodes.BAD_REQUEST, error);
  }
};

enum UpdateOption {
  newBlock = "new-block",
  updateBlock = "update-block",
  updateTranslation = "update-translation",
}

export const updateDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.verbose(
    `User ${req.currentUser?.email} updates document ${req.params.id}`
  );

  try {
    const doc = await getUserDocument(req.currentUser as IUser, req.params.id);

    // Parse data from client's request
    const lang = req.body.translationLang as string;
    const newTitle = req.body.title as string;
    const updates = req.body.content;
    const option = req.body.option as string;

    // Update doc info
    if (newTitle) {
      doc.title = newTitle;
    }
    let translation = doc.translations.find((tr) => tr.lang === lang);

    if (!translation) {
      translation = { lang: lang, content: [] };
      doc.translations.push(translation);
      translation = doc.translations.find((tr) => tr.lang === lang); // Get link to the translation object in mongoose doc
    }

    // Apply updates
    switch (option) {
      case UpdateOption.newBlock:
        for (const block of updates) {
          const [translatedBlock, newMessages] = await translateBlock(
            block,
            doc.messagesHistory
          );

          // Immediately send response to client // TODO: - refactor, here different actions in one place are not clear
          res.write(JSON.stringify(translatedBlock));

          doc.content.push(block);
          translation?.content.push(translatedBlock);
          doc.messagesHistory.push(...newMessages);

          // Wait to stay within Open AI API rate limits
          await new Promise((res) => {
            setTimeout(res, Math.random() * 100);
          });

          await doc.save();
        }
        res.end("success");
        break;
      default:
        sendErrorMessage(res, StatusCodes.NOT_IMPLEMENTED, "In development");
    }
  } catch (error) {
    logger.error(
      `🔥 Could not update user's document. (${(error as Error).message}`
    );
    sendErrorMessage(res, StatusCodes.BAD_REQUEST, error);
  }
};

export const deleteDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.verbose(
    `User ${req.currentUser?.email} deletes document ${req.body.title}`
  );

  try {
    const currentUser = req.currentUser as IUser;
    const doc = await getUserDocument(currentUser, req.params.id);

    // TODO: (later): delete either both or none for consistency
    // eg. mark doc "to delete = true" first and only then proceed
    const deleted = await doc.deleteOne();
    await currentUser.updateOne({ $pull: { docs: deleted._id } });

    sendSuccessMessage(res, StatusCodes.NO_CONTENT, null);
  } catch (error) {
    logger.error(
      `🔥 Could not delete users's document. (${(error as Error).message}`
    );
    sendErrorMessage(res, StatusCodes.BAD_REQUEST, error);
  }
};
