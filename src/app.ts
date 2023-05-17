import express, { Express, Request, Response } from "express";

import httpLogger from "./utils/http-logger";

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

app.use("/api/v1/docs", (req: Request, res: Response): void => {
  res.send("Hello world!");
});

app.all("*", (req: Request, res: Response): void => {
  res.status(404).json({
    status: "fail",
    message: `Can't find resource at: ${req.url}`,
  });
});

export default app;
