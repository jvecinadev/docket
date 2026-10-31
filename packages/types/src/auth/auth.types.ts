import { z } from "zod";
import {
  authResponseSchema,
  changePasswordBodySchema,
  loginBodySchema,
  meResponseSchema,
  publicSessionSchema,
  publicUserSchema,
  registerBodySchema,
  requestPasswordResetBodySchema,
  resetPasswordBodySchema,
  verifyEmailBodySchema,
} from "./auth.schemas";

export type PublicUser = z.infer<typeof publicUserSchema>;
export type PublicSession = z.infer<typeof publicSessionSchema>;
export type AuthResponse = z.infer<typeof authResponseSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;

export type RegisterBody = z.infer<typeof registerBodySchema>;
export type LoginBody = z.infer<typeof loginBodySchema>;
export type RequestPasswordResetBody = z.infer<typeof requestPasswordResetBodySchema>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;
export type VerifyEmailBody = z.infer<typeof verifyEmailBodySchema>;
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;