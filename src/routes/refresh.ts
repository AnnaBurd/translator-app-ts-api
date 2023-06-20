import { Router } from "express";
import { refreshAccess, silentSignIn } from "../controllers/auth";

const router = Router();

router.get("/signin", silentSignIn);
router.get("/", refreshAccess);

export default router;
