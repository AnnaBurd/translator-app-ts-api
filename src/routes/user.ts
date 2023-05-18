import { Router, Request, Response, NextFunction } from "express";

import { signup, login, protectRoute } from "../controllers/auth";

const router = Router();

router.post("/login", login);
router.post("/signup", signup);

router.get("/", (req, res) => {
  res.send("Users API // TODO: docs");
});

// Require users to log in to get access to routes below
router.use(protectRoute);

router.get("/test", (req, res) => {
  console.log("Logged in user:", req.currentUser);

  res.send("Logged in ok");
});

export default router;
