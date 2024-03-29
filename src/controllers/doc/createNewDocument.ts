import { RequestHandler } from "express";
import Doc from "../../models/Doc.js";

import logger from "../../utils/logger.js";

/* Handle creation of new document

Request body is expected to contain:
{title: string - document title, lang: string - language of the original document text, translationLang: string - expected language of the translation}
*/
/**
 * @swagger
 * /api/docs:
 *  post:
 *   description: Create new document.
 *   tags: [Documents]
 *   security:
 *   - bearerAuth: []
 *   requestBody:
 *    required: true
 *    content:
 *      application/json:
 *        schema:
 *          type: object
 *          properties:
 *            title:
 *              type: string
 *              example: New document
 *            lang:
 *              type: string
 *              example: En
 *            translationLang:
 *              type: string
 *              example: Vn
 *   responses:
 *    201:
 *     description: Successfully created new document.
 *     content:
 *      application/json:
 *        schema:
 *          type: object
 *          properties:
 *            status:
 *              type: string
 *              example: success
 *            data:
 *              type: object
 *              properties:
 *                _id:
 *                  type: string
 *                  example: 5f9a2a3b9d3e4d2a3c9d9f4b
 *                slug:
 *                  type: string
 *                  example: new-document-123sc
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
