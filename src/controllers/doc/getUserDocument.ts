import { RequestHandler } from "express";
import { retrieveUserDocument } from "./retrieveUserDocument.js";

/* Handle getting full content of a single document for a user */
export const getUserDocument: RequestHandler = async (req, res, next) => {
  try {
    const doc = await retrieveUserDocument(
      req.currentUserId!,
      req.params.docSlug
    );

    res.status(200).json({ status: "success", data: doc });
  } catch (error) {
    next(error);
  }
};
