import { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.log("Got to express error handler");
  res.status(500);
  res.json({ error: err });
};
