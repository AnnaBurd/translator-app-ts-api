import { RequestHandler } from "express";

import logger from "../utils/logger.js";
import User from "../models/User.js";
import Doc from "../models/Doc.js";
import { AppError, AppErrorName } from "../middlewares/errorHandler.js";

const getUserUsageStatistics = async (userId: string) => {
  // TODO: store statistics not to recalculate it each time
  const userDocuments = await Doc.find({ owner: userId });
  const numberOfDocuments = userDocuments.length;
  const lastEditionAt =
    (
      await Doc.findOne({ owner: userId }).sort({
        changedAt: -1,
      })
    )?.changedAt || null;

  const documentsWithChangesThisMonth = await Doc.find({
    owner: userId,
    changedAt: { $gte: new Date(new Date().setDate(1)) },
  });

  const paragraphsTranslatedThisMonth = documentsWithChangesThisMonth.flatMap(
    (doc) =>
      doc.messagesHistory.filter(
        (message) =>
          (message?.timestamp || 0) >= new Date(new Date().setDate(1)) &&
          message?.role === "assistant"
      )
  );

  const numOfParagraphsTranslatedThisMonth =
    paragraphsTranslatedThisMonth.length;

  const numberOfWordsTranslatedThisMonth = paragraphsTranslatedThisMonth.reduce(
    (sumOfWords, currParagraph) => {
      const words = currParagraph.content.match(/([^\s]+)/g);

      // console.log("currParagraph", currParagraph);
      // console.log("words", words);

      return words ? sumOfWords + words.length : sumOfWords;
    },
    0
  );

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  const tokensUsedTotal = user.tokensUsedTotal;
  const tokensUsedMonth = user.tokensUsedMonth;
  const limit = user.tokensLimit;

  // const totalTokens = userDocuments.reduce(
  //   (sumOfTokens, currDoc) => sumOfTokens + currDoc.tokensUsed,
  //   0
  // );

  const currDate = new Date();
  const baseMonth = new Date(currDate.getFullYear(), currDate.getMonth(), 1);
  baseMonth.setMonth(baseMonth.getMonth() - 4);
  const lastSixMonths = Array.from(
    { length: 6 },
    (_, i) => new Date(baseMonth.getFullYear(), baseMonth.getMonth() + i, 1)
  );

  // console.log("LAST SIX M", lastSixMonths);

  const tokensUsageStats = new Array(6).fill(0);
  const wordsUsageStats = new Array(6).fill(0);
  const docsUsageStats = new Array(6).fill(0);

  userDocuments.forEach((doc) => {
    if (doc.createdAt && doc.createdAt >= baseMonth)
      docsUsageStats[(doc.createdAt.getMonth() + 4) % 6] += 1;

    // console.log("doc.createdAt", docsUsageStats);

    doc.messagesHistory.forEach((message) => {
      // console.log(message);
      if (message.timestamp && message.timestamp > baseMonth) {
        const month = message.timestamp?.getMonth();
        const tokens = message.tokens;
        const words = message.content.match(/([^\s]+)/g);

        // console.log("month", month);
        // console.log("tokens", tokens);
        // console.log("words", words);
        if (month && tokens) tokensUsageStats[(month! + 4) % 6] += tokens;
        if (month && words) wordsUsageStats[(month! + 4) % 6] += words.length;
      }
    });
  });

  // const currDate = new Date();
  // const baseMonth = new Date(currDate.getFullYear(), currDate.getMonth(), 1);
  // baseMonth.setMonth(baseMonth.getMonth() - 4);
  // const sortedMonths = [...months.splice(baseMonth.getMonth()), ...months];
  // const labels = sortedMonths.slice(0, 6);

  // const tokensPerMonthForCurrentYear = new Array(12).fill(0);
  // userDocuments.forEach((doc) => {
  //   doc.messagesHistory.forEach((message) => {
  //     if (message.timestamp?.getFullYear() === new Date().getFullYear()) {
  //       const month = message.timestamp?.getMonth();
  //       const tokens = message.tokens;

  //       if (month && tokens) tokensPerMonthForCurrentYear[month!] += tokens;
  //     }
  //   });
  // });

  return {
    numberOfDocuments,
    lastEditionAt,
    numOfParagraphsTranslatedThisMonth,
    numberOfWordsTranslatedThisMonth,
    totalTokens: tokensUsedTotal,
    tokensUsedMonth,
    tokensUsageStats,
    wordsUsageStats,
    docsUsageStats,
    lastSixMonths,
    limit,
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
