import { RequestHandler } from "express";
import Doc from "../../models/Doc.js";

import logger from "../../utils/logger.js";

/* Handle creation of new document

Request body is expected to contain:
{title: string - document title, lang: string - language of the original document text, translationLang: string - expected language of the translation}
*/
export const createNewDocument: RequestHandler = async (req, res, next) => {
  try {
    // Read input from request body
    const { title, lang, translationLang } = req.body;

    const newDocumentProps = {
      title,
      lang,
      translationLang,
      owner: req.currentUserId,
    };

    // Save new document to the database (also validates data with mongoose schema)
    const newDocument = await new Doc(newDocumentProps).save();

    // Send response back to user
    res.status(201).json({ status: "success", data: newDocument });
  } catch (error) {
    logger.error(
      `🔥 Could not create new document. (${(error as Error).message}`
    );
    next(error);
  }
};
