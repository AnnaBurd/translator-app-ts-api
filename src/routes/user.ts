import { Router, Request, Response, NextFunction } from "express";

import { signup } from "../controllers/auth";

const router = Router();

router.get("/", (req, res) => {
  res.send("Users API // TODO: docs");
});

router.post("/signup", signup);

export default router;
