import { Response } from "express";
import { StatusCodes } from "http-status-codes";

export const sendSuccessMessage = (
  res: Response,
  status: StatusCodes,
  data: any,
  includeResults: boolean = false
): void => {
  const responseBody = {
    status: "success",
    ...(includeResults && { results: data.length }),
    data,
  };

  res.status(status).json(responseBody);
};

export const sendErrorMessage = (
  res: Response,
  status: StatusCodes,
  error: any
): void => {
  const responseBody = {
    status: "failure",
    error,
  };

  res.status(status).json(responseBody);
};
