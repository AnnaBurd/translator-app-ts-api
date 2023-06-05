import { Router } from "express";
import { signin, signup } from "../controllers/user";
import { protectRoute, restrictRouteTo } from "../middlewares/auth";
import { Role } from "../models/User";

const router = Router();

router.post("/signup", signup);
router.post("/signin", signin);

// For registered users:
router.use(protectRoute);
router.get("/profile");
router.patch("profile");
router.delete("profile");

// For admins:
router.use(restrictRouteTo(Role.Admin));
router.get("/", (req, res, next) => {
  res.json({ message: "Here you fo" });
});
router.patch("/:userid");
router.delete("/:userid");

export default router;
