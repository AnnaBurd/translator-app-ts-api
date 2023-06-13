import { Router } from "express";
import { refreshAccess } from "../controllers/auth";

const router = Router();

router.get("/", refreshAccess);

export default router;
