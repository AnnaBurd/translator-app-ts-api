import { RequestHandler } from "express";
import User from "../../models/User.js";
import Doc from "../../models/Doc.js";
import { AppError, AppErrorName } from "../../middlewares/errorHandler.js";
import { getLastSixMonths } from "../../utils/date-helper.js";
import logger from "../../utils/logger.js";

const collectUserUsageStatistics = async (userId: string) => {
  const usageData = await User.findById(userId, {
    tokensUsedTotal: 1,
    tokensUsedMonth: 1,
    tokensLimit: 1,
    wordsTranslatedMonth: 1,
    tokenUsageStats: { $slice: -4 }, // tokenUsageStats is updated every month with db triggers, -4 means last 4 months
  });

  if (!usageData)
    throw new AppError(
      AppErrorName.AppError,
      "Error collecting user usage statistics. Usage data not found."
    );

  const numberOfDocumentsChangedThisMonth = await Doc.countDocuments({
    owner: userId,
    changedAt: { $gte: new Date(new Date().setDate(1)) },
  });

  // Transform token usage stats to array (as used on the frontend)
  // TODO: can edit frontend code as well to minimize unnecessary data transformations
  const lastSixMonths = getLastSixMonths();

  const tokensUsageStats = new Array(6).fill(0);
  const wordsUsageStats = new Array(6).fill(0);
  const docsUsageStats = new Array(6).fill(0);

  usageData.tokenUsageStats.forEach((stat) => {
    const index = lastSixMonths.findIndex(
      (month) => month.getMonth() === stat.date.getMonth()
    );
    if (index === -1) return;
    tokensUsageStats[index] = stat.tokensUsedMonth;
    wordsUsageStats[index] = stat.wordsTranslatedMonth;
    docsUsageStats[index] = stat.documentsChangedMonth;
  });

  // Add statistics for current month
  tokensUsageStats[4] = usageData.tokensUsedMonth;
  wordsUsageStats[4] = usageData.wordsTranslatedMonth;
  docsUsageStats[4] = numberOfDocumentsChangedThisMonth;

  return {
    totalTokens: usageData.tokensUsedTotal,
    tokensUsedMonth: usageData.tokensUsedMonth,
    limit: usageData.tokensLimit,
    tokensUsageStats: tokensUsageStats,
    wordsUsageStats: wordsUsageStats,
    docsUsageStats: docsUsageStats,
    numOfDocumentsChangedThisMonth: numberOfDocumentsChangedThisMonth,
    numberOfWordsTranslatedThisMonth: usageData.wordsTranslatedMonth,
    lastSixMonths: lastSixMonths,
  };
};

/* Return data about user profile and usage statistics */
export const getUserProfile: RequestHandler = async (req, res, next) => {
  try {
    logger.verbose(
      `Getting user profile info for signed in user: ${req.currentUserId}`
    );

    // TODO: retrive only necessary fields, consider caching
    const currentUser = await User.findById(req.currentUserId, { password: 0 });

    if (!currentUser)
      throw new AppError(
        AppErrorName.AuthenticationError,
        "Could not get data for user profile. User not found."
      );

    const usageStatistics = await collectUserUsageStatistics(
      req.currentUserId!
    );

    // Send response back to client
    res.status(200).json({
      status: "success",
      data: { user: currentUser, usageStatistics },
    });
  } catch (error) {
    next(error);
  }
};
