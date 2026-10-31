import { Router } from "express";
import {
  changePasswordBodySchema,
  loginBodySchema,
  registerBodySchema,
  requestEmailVerificationBodySchema,
  requestPasswordResetBodySchema,
  resetPasswordBodySchema,
  revokeSessionBodySchema,
  verifyEmailBodySchema,
} from "@docket/types";
import { validateBody } from "../../middleware/validate-body";
import {
  changePassword,
  confirmEmailVerification,
  confirmPasswordReset,
  listSessions,
  login,
  logout,
  logoutAll,
  me,
  register,
  refresh,
  requestEmailVerification,
  requestPasswordReset,
  revokeSession,
} from "./auth.controller";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerBodySchema), register);
authRouter.post("/login", validateBody(loginBodySchema), login);

authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);

authRouter.get("/me", me);
authRouter.get("/sessions", listSessions);

authRouter.post(
  "/sessions/revoke",
  validateBody(revokeSessionBodySchema),
  revokeSession,
);

authRouter.post("/logout-all", logoutAll);

authRouter.post(
  "/change-password",
  validateBody(changePasswordBodySchema),
  changePassword,
);

authRouter.post(
  "/password-reset/request",
  validateBody(requestPasswordResetBodySchema),
  requestPasswordReset,
);

authRouter.post(
  "/password-reset/confirm",
  validateBody(resetPasswordBodySchema),
  confirmPasswordReset,
);

authRouter.post(
  "/email-verification/request",
  validateBody(requestEmailVerificationBodySchema),
  requestEmailVerification,
);

authRouter.post(
  "/email-verification/confirm",
  validateBody(verifyEmailBodySchema),
  confirmEmailVerification,
);