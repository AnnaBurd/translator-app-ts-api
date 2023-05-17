import express, { Express, Request, Response } from "express";

const app: Express = express();

app.use("/", (req: Request, res: Response): void => {
  res.send("Hello world!");
});

export default app;
