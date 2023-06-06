import { RequestHandler } from "express";
import { HydratedDocument } from "mongoose";
import logger from "../utils/logger";
import Doc, { IDoc } from "../models/Doc";

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

export const getUserDocument: RequestHandler = async (req, res, next) => {
  try {
    const currentUser = req.currentUser!;

    console.log(currentUser.docs, req.params.docId);

    // TODO:
    // Check if requested document belongs to user
    // I can manually do it, but what if database has had changes since last time I requested user data?

    // It is better to run db request to fetch document.
    if (
      currentUser?.docs.some((doc) => {
        console.log("id=", (doc as HydratedDocument<IDoc>)._id.toString());
        return (
          (doc as HydratedDocument<IDoc>)._id.toString() === req.params.docId;
      })
    ) {
      console.log("ok user has document with such id");
    }

    // const currentDoc = aw
  } catch (error) {
    next(error);
  }
};
