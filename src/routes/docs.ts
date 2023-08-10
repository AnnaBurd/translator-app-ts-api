import { Router } from "express";
import { protectRoute } from "../middlewares/auth.js";
import {
  createNewDocument,
  getUserDocument,
  deleteUserDocument,
  editUserDocument,
  getUserDocumentsPreviews,
} from "../controllers/doc/doc.js";

const router = Router();

// For signed in users:
router.use(protectRoute);

router.route("/").get(getUserDocumentsPreviews).post(createNewDocument);
router
  .route("/:docSlug")
  .get(getUserDocument)
  .patch(editUserDocument)
  .delete(deleteUserDocument);

export default router;
