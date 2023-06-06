import { Router } from "express";
import { protectRoute } from "../middlewares/auth";
import {
  createNewDocument,
  getUserDocument,
  getUserDocuments,
} from "../controllers/doc";

const router = Router();

// For signed in users:
router.use(protectRoute);

router.route("/").get(getUserDocuments).post(createNewDocument);
router.route("/:docId").get(getUserDocument).patch().delete();

export default router;
