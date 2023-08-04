import { Router } from "express";
import { protectRoute, restrictRouteTo } from "../middlewares/auth.js";
import { Role } from "../models/User.js";
import {
  deleteUserProfile,
  getAllUsers,
  getAllUsersStats,
  getUserProfile,
  getUserProfileDetails,
  updateUserAccount,
  updateUserProfile,
} from "../controllers/user.js";

import saveAttachedFile from "../services/filestorage/filestorage.js";

import { signup, signin, signout } from "../controllers/auth.js";

const router = Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/signout", signout);

// For signed in users:
router.use(protectRoute);

router
  .route("/profile")
  .get(getUserProfile)
  .post(saveAttachedFile, updateUserProfile)
  // .patch(upload.single("selectedImage"), updateUserProfile)
  .delete(deleteUserProfile);

// router.route("/profile/photo");
// .post(getSingleFileUpload("photo"), (req, res) => {});

router.route("/profile/details").get(getUserProfileDetails);

// For admins:
router.use(restrictRouteTo(Role.Admin));
router.get("/", getAllUsers);
router.get("/usagestatistics", getAllUsersStats);
router.patch("/:userEmail", updateUserAccount);
router.delete("/:userid"); // TODO:

export default router;
