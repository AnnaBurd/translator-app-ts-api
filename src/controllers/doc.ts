import { Request, Response, NextFunction } from "express";

import logger from "../utils/logger";
import Doc, { Language } from "../models/Doc";

export const getUserDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.verbose(`Getting documents for user: ${req.currentUser?.email}`);

  // const docs = TODO:

  try {
    res.status(201).json({ status: "success", data: "ok in development" });
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
    const newDoc = await Doc.create({ title, lang });

    res.status(201).json({ status: "success", data: newDoc });
  } catch (error) {
    logger.error(
      `🔥 Could not create new document. (${(error as Error).message}`
    );
    res.status(400).json({ status: "failure", error });
  }
};
