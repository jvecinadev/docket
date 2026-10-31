import { z } from "zod";
import {
  AUTH_OPAQUE_TOKEN_MAX_LENGTH,
  AUTH_OPAQUE_TOKEN_MIN_LENGTH,
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from "./auth.constants";

const uuidSchema = z.string().uuid();
const isoDateTimeSchema = z.string().datetime();

const emailSchema = z.string().trim().email().max(254);
const nameSchema = z.string().trim().min(1).max(100);
const passwordSchema = z
  .string()
  .min(AUTH_PASSWORD_MIN_LENGTH)
  .max(AUTH_PASSWORD_MAX_LENGTH);

const opaqueTokenSchema = z
  .string()
  .min(AUTH_OPAQUE_TOKEN_MIN_LENGTH)
  .max(AUTH_OPAQUE_TOKEN_MAX_LENGTH);

export const publicUserSchema = z.object({
  id: uuidSchema,
  email: emailSchema,
  name: z.string().nullable(),
  emailVerifiedAt: isoDateTimeSchema.nullable(),
  lastLoginAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const publicSessionSchema = z.object({
  id: uuidSchema,
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
  lastUsedAt: isoDateTimeSchema.nullable(),
  expiresAt: isoDateTimeSchema,
  revokedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
});

export const authResponseSchema = z.object({
  user: publicUserSchema,
  session: publicSessionSchema,
});

export const meResponseSchema = z.object({
  user: publicUserSchema,
});

export const sessionListResponseSchema = z.object({
  sessions: z.array(publicSessionSchema),
});

export const okResponseSchema = z.object({
  ok: z.literal(true),
});

export const registerBodySchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(AUTH_PASSWORD_MAX_LENGTH),
});

export const refreshBodySchema = z.object({}).strict();

export const logoutBodySchema = z.object({}).strict();

export const logoutAllBodySchema = z.object({}).strict();

export const requestPasswordResetBodySchema = z.object({
  email: emailSchema,
});

export const resetPasswordBodySchema = z.object({
  token: opaqueTokenSchema,
  password: passwordSchema,
});

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1).max(AUTH_PASSWORD_MAX_LENGTH),
  newPassword: passwordSchema,
});

export const verifyEmailBodySchema = z.object({
  token: opaqueTokenSchema,
});

export const requestEmailVerificationBodySchema = z.object({
  email: emailSchema,
});

export const revokeSessionBodySchema = z.object({
  sessionId: uuidSchema,
});