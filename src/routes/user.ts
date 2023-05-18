import { Router, Request, Response, NextFunction } from "express";
import { Role } from "../models/User";

import {
  signup,
  login,
  protectRoute,
  restrictRouteTo,
} from "../controllers/auth";

const router = Router();

router.post("/login", login);
router.post("/signup", signup);

// Require users to log in to get access to routes below:
router.use(protectRoute);

router.get("/test", (req, res) => {
  console.log("Logged in user:", req.currentUser);

  res.send("Logged in ok");
});

// Only admins has access to routes below:
router.use(restrictRouteTo(Role.Admin));

router.get("/", (req, res) => {
  res.send("Users API // TODO: docs");
});

export default router;
