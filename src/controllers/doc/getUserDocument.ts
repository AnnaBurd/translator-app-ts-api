import { RequestHandler } from "express";
import { retrieveUserDocument } from "./retrieveUserDocument.js";

/* Handle getting full content of a single document for a user */
/**
 * @swagger
 * /api/docs/{docSlug}:
 *  get:
 *   description: Get a single document that belongs to signed-in user.
 *   tags: [Documents]
 *   security:
 *   - bearerAuth: []
 *   parameters:
 *   - in: path
 *   name: docSlug
 *   schema:
 *     type: string
 *     required: true
 *     description: Slug of the document, for example, new-document-12sd2
 *   responses:
 *    200:
 *     description: Successfully return user's document.
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
 *                  example: 5f9a2c7b9d1e8e2d1c0f8b9c
 *                title:
 *                  type: string
 *                  example: New Document
 */
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
