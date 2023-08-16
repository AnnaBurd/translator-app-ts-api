import { RequestHandler } from "express";
import Doc from "../../models/Doc.js";

/* Handle deleting a single document -> does not delete document from the database, only marks it as deleted */
/**
 * @swagger
 * /api/docs/{docSlug}:
 *  delete:
 *   description: Delete a single document that belongs to signed-in user.
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
 *    204:
 *     description: Successfully deleted user's document.
 *     content:
 *      application/json:
 *        schema:
 *          type: object
 *          properties:
 *            status:
 *              type: string
 *              example: success
 *            data:
 *              type: string
 *              example: deleted
 */
export const deleteUserDocument: RequestHandler = async (req, res, next) => {
  try {
    const ownerId = req.currentUserId!;
    const docSlug = req.params.docSlug;

    await Doc.findOneAndUpdate(
      { slug: docSlug, owner: ownerId },
      { deleted: true }
    );

    res.status(204).json({ status: "success", data: "deleted" });
  } catch (error) {
    next(error);
  }
};
