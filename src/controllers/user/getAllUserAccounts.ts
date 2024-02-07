import { RequestHandler } from "express";
import { parsePaginationParams } from "../../utils/pagination-helper.js";
import User from "../../models/User.js";
import logger from "../../utils/logger.js";

/**
 * @swagger
 * /api/users:
 *  get:
 *   description: Get information about current application users, paginated.
 *   tags: [Administration (for admins only)]
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
 *     description: Return an array of users.
 *     content:
 *      application/json:
 *        schema:
 *          type: array
 *          items:
 *            type: object
 *            properties:
 *              firstName:
 *               type: string
 *               example: John
 *              lastName:
 *                type: string
 *                example: Doe
 *              email:
 *                type: string
 *                example: emailex@mail.com
 *              role:
 *                type: string
 *                example: User
 *              registrationDate:
 *                type: string
 *                example: 2021-01-01T00:00:00.000Z
 *              tokensUsedMonth:
 *                type: integer
 *                example: 0
 *              tokensUsedTotal:
 *                type: integer
 *                example: 123123
 *              tokensLimit:
 *                type: integer
 *                example: 1000000
 *              isBlocked:
 *                type: boolean
 *                example: false
 */
export const getAllUserAccounts: RequestHandler = async (req, res, next) => {
  logger.verbose(
    `Getting user accounts data: requested by admin ${req.currentUser?.email}`
  );

  const { pageNumber, itemsPerPage } = parsePaginationParams(req, 1, 2);

  try {
    const users = await User.find(
      { isDeleted: { $ne: true } },
      {
        firstName: 1,
        lastName: 1,
        email: 1,
        role: 1,
        registrationDate: 1,
        tokensUsedMonth: 1,
        tokensUsedTotal: 1,
        tokensLimit: 1,
        isBlocked: 1,
        _id: 0,
      }
    )
      .sort({ status: 1, email: 1 })
      .limit(itemsPerPage)
      .skip((pageNumber - 1) * itemsPerPage);

    const count = await User.countDocuments({
      deleted: { $ne: true },
    });

    res.status(200).json({
      status: "success",
      data: users,
      currentPage: pageNumber,
      totalPages: Math.ceil(count / itemsPerPage),
    });
  } catch (error) {
    logger.error(
      `🔥 Could not get user accounts data (${(error as Error).message})`
    );
    next(error);
  }
};
