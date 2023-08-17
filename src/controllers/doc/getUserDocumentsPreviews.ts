import { RequestHandler } from "express";
import Doc from "../../models/Doc.js";
import logger from "../../utils/logger.js";
import { parsePaginationParams } from "../../utils/pagination-helper.js";

/* Get partial document data for user's documents, 
paginated with default limit of 10 documents per page, 
recently changed documents are served on first pages. */
/**
 * @swagger
 * /api/docs:
 *  get:
 *   description: Get previews for a number of user's documens.
 *   tags: [Documents]
 *   security:
 *   - bearerAuth: []
 *   parameters:
 *    - in: query
 *      name: page
 *      description: Page number to return.
 *      schema:
 *        type: integer
 *    - in: query
 *      name: limit
 *      description: Number of items per page.
 *      schema:
 *        type: integer
 *   responses:
 *    200:
 *     description: Successfully return user's documents previews data.
 *     content:
 *      application/json:
 *        schema:
 *          type: object
 *          properties:
 *            status:
 *              type: string
 *              example: success
 *            currentPage:
 *              type: integer
 *              example: 1
 *            totalPages:
 *              type: integer
 *              example: 10
 *            data:
 *              type: array
 *              items:
 *                type: object
 *                properties:
 *                  _id:
 *                    type: string
 *                    example: 5f9a2c7b9d1e8e2d1c0f8b9c
 *                  title:
 *                    type: string
 *                    example: New Document
 */
export const getUserDocumentsPreviews: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    // Get page number and items per page from query string
    const { pageNumber, itemsPerPage } = parsePaginationParams(req);

    // Fetch relevant documents data from the database
    const userDocuments = await Doc.find(
      {
        owner: req.currentUserId,
        deleted: { $ne: true },
      },
      {
        title: 1,
        slug: 1,
        changedAt: 1,
        createdAt: 1,
        lang: 1,
        translationLang: 1,
        content: { $slice: 1 },
        translationContent: { $slice: 1 },
      }
    )
      .sort({ changedAt: -1 })
      .limit(itemsPerPage)
      .skip((pageNumber - 1) * itemsPerPage);

    // NOTE: pagination approach with skip and limit can result in errors when documents are added or deleted, the safer approach would be to use cursor based pagination
    // Still, the documents are not expected to be added or deleted frequently, so this approach is used for simplicity

    // Count total number of documents
    const count = await Doc.countDocuments({
      owner: req.currentUserId,
      deleted: { $ne: true },
    });

    // Transform data into the expected format
    const data = userDocuments.map((doc) => {
      return {
        title: doc.title,
        slug: doc.slug,
        lang: doc.lang,
        translationLang: doc.translationLang,
        changedAt: doc.changedAt,
        createdAt: doc.createdAt,
        textPreview: doc.content[0]?.text.slice(0, 200) || "",
        translationPreview: doc.translationContent[0]?.text.slice(0, 200) || "",
      };
    });

    // Send response
    res.status(200).json({
      status: "success",
      data,
      currentPage: pageNumber,
      totalPages: Math.ceil(count / itemsPerPage),
    });
  } catch (error) {
    logger.error(
      `🔥 Could not get user's documents previews. (${(error as Error).message}`
    );
    next(error);
  }
};
