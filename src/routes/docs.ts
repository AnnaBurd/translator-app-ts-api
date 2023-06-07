import { Router } from "express";
import { protectRoute } from "../middlewares/auth";
import {
  createNewDocument,
  readUserDocument,
  getUserDocuments,
  addNewBlockToTranslate,
} from "../controllers/doc";

const router = Router();

// For signed in users:
router.use(protectRoute);

router.route("/").get(getUserDocuments).post(createNewDocument);
router
  .route("/:docId")
  .get(readUserDocument)
  .post(addNewBlockToTranslate)
  .patch()
  .delete();

export default router;
