import { z } from "zod";
import {
  authResponseSchema,
  changePasswordBodySchema,
  loginBodySchema,
  logoutAllBodySchema,
  logoutBodySchema,
  meResponseSchema,
  okResponseSchema,
  publicSessionSchema,
  publicUserSchema,
  refreshBodySchema,
  registerBodySchema,
  requestEmailVerificationBodySchema,
  requestPasswordResetBodySchema,
  resetPasswordBodySchema,
  revokeSessionBodySchema,
  sessionListResponseSchema,
  verifyEmailBodySchema,
} from "./auth.schemas";

export type PublicUser = z.infer<typeof publicUserSchema>;
export type PublicSession = z.infer<typeof publicSessionSchema>;

export type AuthResponse = z.infer<typeof authResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type SessionListResponse = z.infer<typeof sessionListResponseSchema>;
export type OkResponse = z.infer<typeof okResponseSchema>;

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RefreshBody = z.infer<typeof refreshBodySchema>;
export type LogoutBody = z.infer<typeof logoutBodySchema>;
export type LogoutAllBody = z.infer<typeof logoutAllBodySchema>;

export type RequestPasswordResetBody = z.infer<typeof requestPasswordResetBodySchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;

export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>;
export type RequestEmailVerificationBody = z.infer<
  typeof requestEmailVerificationBodySchema
>;

export type RevokeSessionBody = z.infer<typeof revokeSessionBodySchema>;