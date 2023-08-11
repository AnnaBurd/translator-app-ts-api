import { RequestHandler } from "express";
import { parsePaginationParams } from "../../utils/pagination-helper.js";
import User from "../../models/User.js";
import logger from "../../utils/logger.js";

export const getAllUserAccounts: RequestHandler = async (req, res, next) => {
  logger.verbose(
    `Getting user accounts data: requested by admin ${req.currentUser?.email}`
  );

  const { pageNumber, itemsPerPage } = parsePaginationParams(req, 1, 2);

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
    logger.error(
      `🔥 Could not get user accounts data (${(error as Error).message})`
    );
    next(error);
  }
};
