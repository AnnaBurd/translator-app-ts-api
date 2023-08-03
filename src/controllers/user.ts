import { RequestHandler } from "express";

import logger from "../utils/logger.js";
import User from "../models/User.js";
import Doc from "../models/Doc.js";
import { AppError, AppErrorName } from "../middlewares/errorHandler.js";
import { getLastSixMonths } from "../utils/date-helper.js";
import RefreshToken from "../models/RefreshToken.js";
import { Response } from "express-serve-static-core";
import { detatchRefreshToken } from "./auth.js";

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

export const getUserProfileDetails: RequestHandler = async (req, res, next) => {
  try {
    logger.verbose(`Getting user info for user with id: ${req.currentUserId}`);

    const currentUser = await User.findById(req.currentUserId, {
      registrationDate: 1,
      email: 1,
      _id: 0,
    });

    if (!currentUser)
      throw new AppError(AppErrorName.AuthenticationError, "User not found");

    // console.log("getting user profile with statistics")

    // Send response back to client
    res.status(200).json({
      status: "success",
      data: {
        registrationDate: currentUser.registrationDate,
        email: currentUser.email,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile: RequestHandler = async (req, res, next) => {
  try {
    logger.verbose(`Getting user info for user with id: ${req.currentUserId}`);

    // TODO: filter user data to output only relevant fields
    const currentUser = await User.findById(req.currentUserId);

    if (!currentUser)
      throw new AppError(AppErrorName.AuthenticationError, "User not found");

    const { firstName, lastName, newEmail, currentPassword, newPassword } =
      req.body;

    console.log(
      "got data:",
      firstName,
      lastName,
      newEmail,
      currentPassword,
      newPassword
    );

    // Update user name
    if (firstName) currentUser.firstName = firstName;
    if (lastName) currentUser.lastName = lastName;

    // Update user email (!) email should be unique
    if (newEmail) currentUser.email = newEmail;

    // Update user password (! check if previous password is correct)
    if (currentPassword && newPassword) {
      const isCorrectPassword = await currentUser.isCorrectPassword(
        currentPassword
      );
      if (!isCorrectPassword)
        throw new AppError(
          AppErrorName.AuthenticationError,
          "Incorrect password"
        );
      currentUser.password = newPassword;
    }

    await currentUser.save();

    // Send response back to client
    res.status(200).json({
      status: "success",
      data: {
        user: {
          email: currentUser.email,
          firstName: currentUser.firstName,
          lastName: currentUser.lastName,
          photo: currentUser.photoUrl,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
export const deleteUserProfile: RequestHandler = async (req, res, next) => {
  try {
    logger.verbose(`User requested to delete profile: ${req.currentUserId}`);

    // TODO: filter user data to output only relevant fields
    const currentUser = await User.findById(req.currentUserId);

    if (!currentUser)
      throw new AppError(AppErrorName.AuthenticationError, "User not found");

    const { confirmDelete } = req.body;

    if (!confirmDelete)
      throw new AppError(
        AppErrorName.ValidationError,
        "Confirm delete is required"
      );

    // Update user password
    // Note: set user deleted flag, but do not remove data from the database yet
    // if (confirmDelete) await User.deleteOne({ _id: req.currentUserId });

    await User.updateOne(
      { _id: req.currentUserId },
      {
        isDeleted: true,
        email: `${currentUser.email}-deleted-${Date.now().toString()}`,
      }
    );

    // ALSO CLEAR AL ISSUED TO USER REFRESH TOKENS
    await RefreshToken.deleteMany({ owner: req.currentUserId });

    // logout user
    // Inform browser on client side that refresh token cookie should be deleted
    detatchRefreshToken(res);

    // Note: access token is still active, client side needs to  delete it

    // Send response back to client
    res.status(204).json({ status: "success", data: "deleted" });
  } catch (error) {
    next(error);
  }
};

export const getAllUsersStats: RequestHandler = async (req, res, next) => {
  logger.verbose(
    `Getting all users info (requested by admin: ${req.currentUser?.email})`
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
        activeUsers: activeUsersCount,
        blockedUsers: blockedUsersCount,
        inactiveUsers: inactiveUsersCount,
        tokensUsedMonth: totalTokensUsedMonth,
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

  // Use user-specified or defaul page number and number of items per page
  const { page: userRequestedPage, limit: userRequestedLimit } = req.query;
  const pageNumber = parseInt(userRequestedPage as string) || 1;
  const itemsPerPage = parseInt(userRequestedLimit as string) || 2;
  if (pageNumber < 1 || itemsPerPage < 1)
    throw new AppError(
      AppErrorName.ValidationError,
      "Invalid page number or number of items, accept only positive integers"
    );

  try {
    const users = await User.find(
      { deleted: { $ne: true } },
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
    logger.error(`🔥 Could not get users data (${(error as Error).message})`);
    next(error);
  }
};

export const updateUserAccount: RequestHandler = async (req, res, next) => {
  try {
    // Get requested updates from request body
    const { isBlocked, planOption: newTokensLimitIncrease } = req.body;

    // Prepare mongodb updates object
    let updates: any = {};

    // Block/unblock user
    if (isBlocked !== undefined) updates.isBlocked = isBlocked;

    // Add tokens to user account limit
    // Note: increaseBy should correspond to the frontend values
    if (newTokensLimitIncrease !== undefined) {
      let increaseBy = 0;
      switch (newTokensLimitIncrease) {
        case "Standart":
          increaseBy = 10000;
          break;
        case "Comfort":
          increaseBy = 100000;
          break;
        case "Premium":
          increaseBy = 1000000;
          break;
      }

      updates = { ...updates, $inc: { tokensLimit: increaseBy } }; // Atomicly increase limit
    }

    // Get back updated user info
    const updatedUser = await User.findOneAndUpdate(
      { email: req.params.userEmail },
      updates,
      { fields: { isBlocked: 1, tokensLimit: 1 }, new: true } // Return only updated fields,
    );

    // Check if update was successful
    if (!updatedUser)
      throw new AppError(
        AppErrorName.ResourceNotFoundError,
        "Trying to update not existing user"
      );

    // Send updated fields back to client
    res.status(200).json({
      status: "success",
      data: updatedUser,
    });
  } catch (error) {
    logger.error(
      `🔥 Could not update user's data (${(error as Error).message})`
    );
    next(error);
  }
};
