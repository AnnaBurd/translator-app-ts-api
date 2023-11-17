import { RequestHandler } from "express";
import User from "../../models/User.js";
import logger from "../../utils/logger.js";

/* Get all user accounts usage statistics - total number of users, number of active, inactive, blocked users, and total tokens usage */
/**
 * @swagger
 * /api/users/usagestatistics:
 *  get:
 *   description: Get all user accounts usage statistics - total number of users, number of active, inactive, blocked users, and total tokens usage.
 *   tags: [Administration (for admins only)]
 *   security:
 *   - bearerAuth: []
 *   responses:
 *    200:
 *     description: Successfully fetched total usage statistics.
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
 *                totalUsers:
 *                  type: number
 *                  example: 100
 *                activeUsers:
 *                  type: number
 *                  example: 12
 *                inactiveUsers:
 *                  type: number
 *                  example: 80
 *                blockedUsers:
 *                  type: number
 *                  example: 8
 *                tokensUsedMonth:
 *                  type: number
 *                  example: 122000
 */
export const getAllUserAccountsUsageStats: RequestHandler = async (
  req,
  res,
  next
) => {
  logger.verbose(
    `Getting user accounts total usage statistics: requested by admin ${req.currentUser?.email}`
  );
  try {
    const totalUsersCount = await User.countDocuments({
      isDeleted: { $ne: true },
    });
    const blockedUsersCount = await User.countDocuments({
      deleted: { $ne: true },
      isBlocked: true,
    });

    const usersWithMonthlyTokensUsage = await User.find(
      {
        deleted: { $ne: true },
        tokensUsedMonth: { $gt: 0 },
      },
      { tokensUsedMonth: 1, isBlocked: 1, _id: 0 }
    );

    const totalTokensUsedMonth = usersWithMonthlyTokensUsage.reduce(
      (total, currUser) => total + currUser.tokensUsedMonth,
      0
    );

    const activeUsersCount = usersWithMonthlyTokensUsage.filter(
      (user) => !user.isBlocked
    ).length;

    const inactiveUsersCount =
      totalUsersCount - activeUsersCount - blockedUsersCount;

    res.status(200).json({
      status: "success",
      data: {
        totalUsers: totalUsersCount,
        activeUsers: activeUsersCount,
        inactiveUsers: inactiveUsersCount,
        blockedUsers: blockedUsersCount,
        tokensUsedMonth: totalTokensUsedMonth,
      },
    });
  } catch (error) {
    next(error);
  }
};
