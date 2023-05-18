import express, { Express, Request, Response } from "express";

import httpLogger from "./utils/http-logger";
import userRouter from "./routes/user";

import cookieParser from "cookie-parser";

const app: Express = express();

// Follow recommended network security practices
// if (process.env.NODE_ENV === "production") {
// app.use(cors());
// app.use(helmet());
// app.use(rateLimit({ max: 100, windowMs: 30 * 60 * 1000 }));
// }

// TODO: check if really needed (after frontend is handled)
// app.use(mongoSanitize());
// app.use(xss());

app.use(httpLogger);

app.use(express.json({ limit: "10kb" })); // Parse request body
app.use(cookieParser());

app.use("/api/v1/users", userRouter);

app.get("/", (req: Request, res: Response): void => {
  res.send(`Hello from backend! Use /api/v1/docs 🔚 or /api/v1/users 🔚`);
});

app.all("*", (req: Request, res: Response): void => {
  res.status(404).json({
    status: "fail",
    message: `Can't find resource at: ${req.url}`,
  });
});

export default app;
