import { Router } from "express";
import { protectRoute } from "../middlewares/auth.js";
import {
  createNewDocument,
  readUserDocument,
  getUserDocuments,
  deleteUserDocument,
  editUserDocument,
} from "../controllers/doc.js";

const router = Router();

// For signed in users:
router.use(protectRoute);

router.route("/").get(getUserDocuments).post(createNewDocument);
router
  .route("/:docId")
  .get(readUserDocument)
  .patch(editUserDocument)
  .delete(deleteUserDocument);

export default router;
