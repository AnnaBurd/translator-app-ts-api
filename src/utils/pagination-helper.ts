import { Request } from "express";
import { AppError, AppErrorName } from "../middlewares/errorHandler.js";

export const parsePaginationParams = (
  req: Request,
  defaultPage = 1,
  defaultItemsPerPage = 10
) => {
  const { page: userRequestedPage, limit: userRequestedLimit } = req.query;

  const pageNumber = parseInt(userRequestedPage as string) || defaultPage;
  const itemsPerPage =
    parseInt(userRequestedLimit as string) || defaultItemsPerPage;
  if (pageNumber < 1 || itemsPerPage < 1)
    throw new AppError(
      AppErrorName.ValidationError,
      "Invalid page number or number of items, accept only positive integers"
    );

  return { pageNumber, itemsPerPage };
};
