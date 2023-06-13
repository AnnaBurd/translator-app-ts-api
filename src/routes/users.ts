import { Router } from "express";
import { protectRoute, restrictRouteTo } from "../middlewares/auth";
import { Role } from "../models/User";
import { getAllUsersStats, getUserProfile } from "../controllers/user";
import { signup, signin, signout } from "../controllers/auth";

const router = Router();

router.post("/signup", signup);
router.post("/signin", signin);

// For signed in users:
router.use(protectRoute);

router.get("/signout", signout);

router.route("/profile").get(getUserProfile).patch().delete();

// router.patch("/profile"); // TODO:
// router.delete("/profile"); // TODO:

// For admins:
router.use(restrictRouteTo(Role.Admin));
router.get("/", getAllUsersStats);
router.patch("/:userid"); // TODO:
router.delete("/:userid"); // TODO:

export default router;
