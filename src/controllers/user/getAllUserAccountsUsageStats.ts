import { RequestHandler } from "express";
import User from "../../models/User.js";
import logger from "../../utils/logger.js";

/* Get all user accounts usage statistics - total number of users, number of active, inactive, blocked users, and total tokens usage */
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
      deleted: { $ne: true },
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
