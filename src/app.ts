import express, { Request, Response, json } from "express";

import cookieParser from "cookie-parser";
import cors from "cors";

import {
  AppError,
  AppErrorName,
  errorHandler,
} from "./middlewares/errorHandler.js";
import httpLogger from "./utils/http-logger.js";

import userRoutes from "./routes/users.js";
import refreshAccessRoute from "./routes/refresh.js";
import docRoutes from "./routes/docs.js";

const app = express();

// Log incoming http requests
app.use(httpLogger);

// Apply cors policy
// TODO: Configurations - Temporary confugured as CORS-enabled for all origins
app.use(
  cors({
    credentials: true,
    origin: true,
  })
);

// Parse and save request body into req.body
app.use(json({ limit: "10kb" }));

// Parse and save request cookies into req.cookies
app.use(cookieParser());

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/refresh", refreshAccessRoute);
app.use("/api/docs", docRoutes);

app.all("*", (req: Request, _: Response, next) => {
  next(
    new AppError(
      AppErrorName.ResourceNotFoundError,
      `Can't find resource at: ${req.url}`
    )
  );
});

app.use(errorHandler);

export default app;
