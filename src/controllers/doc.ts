import { Request, Response, NextFunction } from "express";

import logger from "../utils/logger";
import Doc, { IDoc } from "../models/Doc";
import { IUser } from "../models/User";

export const getUserDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.verbose(`Getting documents for user: ${req.currentUser?.email}`);

  try {
    const currentUser = req.currentUser as IUser;
    await currentUser.populate({
      path: "docs",
    });

    res.status(201).json({
      status: "success",
      results: currentUser.docs.length,
      data: currentUser.docs,
    });
  } catch (error) {
    logger.error(
      `🔥 Could not get user's documents. (${(error as Error).message}`
    );
    res.status(400).json({ status: "failure", error });
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

    res.status(201).json({ status: "success", data: newDoc });
  } catch (error) {
    logger.error(
      `🔥 Could not create new document. (${(error as Error).message}`
    );
    res.status(400).json({ status: "failure", error });
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

    res.status(200).json({ status: "success", data: doc });
  } catch (error) {
    logger.error(`🔥 Could not open document. (${(error as Error).message})`);
    res.status(400).json({ status: "failure", error });
  }
};

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

    // const updates = TODO:

    res.status(501).json({ status: "success", data: "In development" });
  } catch (error) {
    logger.error(
      `🔥 Could not update user's document. (${(error as Error).message}`
    );
    res.status(400).json({ status: "failure", error });
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

    res.status(204).json({ status: "success", data: null });
  } catch (error) {
    logger.error(
      `🔥 Could not delete users's document. (${(error as Error).message}`
    );
    res.status(400).json({ status: "failure", error });
  }
};
