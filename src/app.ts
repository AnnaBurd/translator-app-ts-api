import express, { Request, Response, json } from "express";

import httpLogger from "./utils/http-logger";

import userRoutes from "./routes/users";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

// Log incoming http requests
app.use(httpLogger);

// Parse and save request body into req.body
app.use(json({ limit: "10kb" }));

app.use("/api/users", userRoutes);

app.all("*", (req: Request, res: Response): void => {
  res.status(404).json({
    status: "fail",
    message: `Can't find resource at: ${req.url}`,
  });
});

app.use(errorHandler);

export default app;
