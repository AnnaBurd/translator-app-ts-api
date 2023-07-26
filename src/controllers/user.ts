import { RequestHandler } from "express";

import logger from "../utils/logger.js";
import User from "../models/User.js";
import Doc from "../models/Doc.js";
import { AppError, AppErrorName } from "../middlewares/errorHandler.js";
import { getLastSixMonths } from "../utils/date-helper.js";

const getUserUsageStatistics = async (userId: string) => {
  // Get user usage statistics (tokenUsageStats is generated and monthly updated in the database)
  const usageStatistics = await User.findById(userId, {
    tokensUsedTotal: 1,
    tokensUsedMonth: 1,
    tokensLimit: 1,
    wordsTranslatedMonth: 1,
    tokenUsageStats: { $slice: -4 }, // Get statistics for the last 4 months
  });

  const numberOfDocumentsChangedThisMonth = await Doc.countDocuments({
    owner: userId,
    changedAt: { $gte: new Date(new Date().setDate(1)) },
  });

  if (!usageStatistics)
    throw new AppError(AppErrorName.AuthenticationError, "User not found");

  // Transform token usage stats to array (as used on the frontend)
  // TODO: can edit frontend code as well to minimize unnecessary data transformations
  const lastSixMonths = getLastSixMonths();

  const tokensUsageStats = new Array(6).fill(0);
  const wordsUsageStats = new Array(6).fill(0);
  const docsUsageStats = new Array(6).fill(0);

  usageStatistics.tokenUsageStats.forEach((stat) => {
    const index = lastSixMonths.findIndex(
      (month) => month.getMonth() === stat.date.getMonth()
    );
    if (index === -1) return;
    tokensUsageStats[index] = stat.tokensUsedMonth;
    wordsUsageStats[index] = stat.wordsTranslatedMonth;
    docsUsageStats[index] = stat.documentsChangedMonth;
  });

  // Add statistics for current month
  tokensUsageStats[4] = usageStatistics.tokensUsedMonth;
  wordsUsageStats[4] = usageStatistics.wordsTranslatedMonth;
  docsUsageStats[4] = numberOfDocumentsChangedThisMonth;

  return {
    totalTokens: usageStatistics.tokensUsedTotal,
    tokensUsedMonth: usageStatistics.tokensUsedMonth,
    limit: usageStatistics.tokensLimit,
    tokensUsageStats: tokensUsageStats,
    wordsUsageStats: wordsUsageStats,
    docsUsageStats: docsUsageStats,
    numOfDocumentsChangedThisMonth: numberOfDocumentsChangedThisMonth,
    numberOfWordsTranslatedThisMonth: usageStatistics.wordsTranslatedMonth,
    lastSixMonths: lastSixMonths,
  };
};

export const getUserProfile: RequestHandler = async (req, res, next) => {
  try {
    logger.verbose(`Getting user info for user with id: ${req.currentUserId}`);

    // TODO: filter user data to output only relevant fields
    const currentUser = await User.findById(req.currentUserId);

    if (!currentUser)
      throw new AppError(AppErrorName.AuthenticationError, "User not found");

    // console.log("getting user profile with statistics");

    const usageStatistics = await getUserUsageStatistics(req.currentUserId!);

    // Send response back to client
    res.status(200).json({
      status: "success",
      data: { user: currentUser, usageStatistics },
    });
  } catch (error) {
    next(error);
  }
};

// TODO: refactor
export const getAllUsersStats: RequestHandler = async (req, res, next) => {
  logger.verbose(
    `Getting all users info (required by admin): ${req.currentUser?.email}`
  );
  try {
    const activeUsers = await User.find({
      deleted: { $ne: true },
      tokensUsedMonth: { $gt: 0 },
    });

    const tokensUsedMonth = activeUsers.reduce(
      (total, currUser) => total + currUser.tokensUsedMonth,
      0
    );

    const blockedUsers = await User.countDocuments({
      deleted: { $ne: true },
      isBlocked: true,
    });

    const inactiveUsers =
      (await User.countDocuments()) - activeUsers.length - blockedUsers;

    // console.log(activeUsers);

    res.status(200).json({
      status: "success",
      data: {
        activeUsers: activeUsers.length,
        tokensUsedMonth,
        blockedUsers,
        inactiveUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers: RequestHandler = async (req, res, next) => {
  logger.verbose(
    `Getting all users info (required by admin): ${req.currentUser?.email}`
  );

  // TODO: filter user data to output only relevant fields

  const { page, limit } = req.query;

  // Make sure that page and limit are valid numbers
  const requestedPageNumber = parseInt(page as string) || 1;
  const itemsPerPage = parseInt(limit as string) || 2;
  if (requestedPageNumber < 1 || itemsPerPage < 1)
    throw new Error("Invalid page or limit value");

  try {
    const users = await User.find({ deleted: { $ne: true } })
      .limit(itemsPerPage)
      .skip((requestedPageNumber - 1) * itemsPerPage);

    const count = await User.countDocuments({
      deleted: { $ne: true },
    });

    // TODO: paginate results
    res.status(200).json({
      status: "success",
      data: users,
      currentPage: page,
      totalPages: Math.ceil(count / itemsPerPage),
    });
  } catch (error) {
    logger.error(`🔥 Could not get users data (${(error as Error).message})`);
    next(error);
  }
};

export const updateUserAccount: RequestHandler = async (req, res, next) => {
  const userEmail = req.params.userEmail;

  const { isBlocked, planOption } = req.body;

  console.log("isBlocked", isBlocked);
  console.log("userEmail", userEmail);

  console.log("planOption", planOption);

  console.log("req.body", req.body);

  // TODO: filter user data to output only relevant fields

  // const { page, limit } = req.query;

  // Make sure that page and limit are valid numbers
  // const requestedPageNumber = parseInt(page as string) || 1;
  // const itemsPerPage = parseInt(limit as string) || 2;
  // if (requestedPageNumber < 1 || itemsPerPage < 1)
  //   throw new Error("Invalid page or limit value");

  // const updates: { isBlocked?: boolean; tokensLimit?: number } = {};
  // if (isBlocked !== "undefined") updates["isBlocked"] = isBlocked;
  // if (planOption !== "undefined") updates["tokensLimit"] = newLimit;

  // console.log("updates", updates);

  try {
    const user = await User.findOne({ email: userEmail });

    if (!user) throw new Error("User not found");

    if (isBlocked !== undefined) user.isBlocked = isBlocked;
    if (planOption !== undefined) {
      const newLimit =
        planOption === "Enterprise"
          ? 100000000
          : planOption === "Premium"
          ? 10000000
          : planOption === "Standard"
          ? 1000000
          : 0;
      user.tokensLimit = newLimit;
    }

    await user.save();

    res.status(200).json({
      status: "success",
      data: user,
    });
  } catch (error) {
    logger.error(
      `🔥 Could not update users data (${(error as Error).message})`
    );
    next(error);
  }
};
