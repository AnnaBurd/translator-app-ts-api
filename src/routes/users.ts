import { Router } from "express";
import { Role } from "../models/User.js";
import { protectRoute, restrictRouteTo } from "../middlewares/auth.js";
import {
  deleteUserProfile,
  getAllUserAccounts,
  getAllUserAccountsUsageStats,
  getUserProfile,
  getUserProfileDetails,
  manageUserAccount,
  updateUserProfile,
} from "../controllers/user/user.js";

import saveAttachedFile from "../services/filestorage/filestorage.js";

import {
  signup,
  signin,
  signout,
  reset,
  confirmReset,
} from "../controllers/auth/auth.js";

const router = Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/reset", reset);
router.post("/confirmReset", confirmReset);
router.get("/signout", signout);

// For signed in users:
router.use(protectRoute);

router
  .route("/profile")
  .get(getUserProfile)
  .post(saveAttachedFile, updateUserProfile)
  .delete(deleteUserProfile);

router.route("/profile/details").get(getUserProfileDetails);

// For admins:
router.use(restrictRouteTo(Role.Admin));
router.get("/", getAllUserAccounts);
router.get("/usagestatistics", getAllUserAccountsUsageStats);
router.patch("/:userEmail", manageUserAccount);

export default router;
