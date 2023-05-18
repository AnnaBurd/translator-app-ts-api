import { Request, Response, NextFunction } from "express";

import logger from "../utils/logger";
import Doc from "../models/Doc";
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
