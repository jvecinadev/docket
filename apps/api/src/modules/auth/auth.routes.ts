import { Router } from "express";
import {
  loginBodySchema,
  registerBodySchema,
} from "@docket/types";
import { validateBody } from "../../middleware/validate";
import { requireAuth } from "../../middleware/require-auth";
import { authController } from "./auth.controller";

const router = Router();

router.post("/register", validateBody(registerBodySchema), authController.register);
router.post("/login", validateBody(loginBodySchema), authController.login);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, authController.me);

export default router;