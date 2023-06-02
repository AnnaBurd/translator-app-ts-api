import { Router } from "express";
import { signup } from "../controllers/user";

const router = Router();

router.post("/signup", signup);
router.post("/signin");

// For registered users:
router.get("/profile");
router.patch("profile");
router.delete("profile");

// For admins:
router.get("/", (req, res, next) => {
  res.json({ message: "Here you fo" });
});
router.patch("/:userid");
router.delete("/:userid");

export default router;
