import { Router, Request, Response, NextFunction } from "express";
import { Role } from "../models/User";

import { protectRoute, restrictRouteTo } from "../controllers/auth";
import {
  createNewDoc,
  getUserDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
} from "../controllers/doc";

const router = Router();

// Require users to log in to get access to routes below:
router.use(protectRoute);

router.route("/").get(getUserDocuments).post(createNewDoc);

router
  .route("/:id")
  .get(getDocument)
  .patch(updateDocument)
  .delete(deleteDocument);

// Only admins has access to routes below:
router.use(restrictRouteTo(Role.Admin));

// ...

export default router;
