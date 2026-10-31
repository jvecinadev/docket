import { z } from "zod";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  TOKEN_MAX_LENGTH,
  TOKEN_MIN_LENGTH,
} from "./auth.constants";

const uuidSchema = z.string().uuid();
const isoDateTimeSchema = z.string().datetime();

const emailSchema = z.string().trim().email().max(254);
const nameSchema = z.string().trim().min(1).max(100);
const passwordSchema = z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH);
const tokenSchema = z.string().min(TOKEN_MIN_LENGTH).max(TOKEN_MAX_LENGTH);

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

export const registerBodySchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
});

export const requestPasswordResetBodySchema = z.object({
  email: emailSchema,
});

export const resetPasswordBodySchema = z.object({
  token: tokenSchema,
  password: passwordSchema,
});

export const verifyEmailBodySchema = z.object({
  token: tokenSchema,
});

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1).max(PASSWORD_MAX_LENGTH),
  newPassword: passwordSchema,
});

export const authResponseSchema = z.object({
  user: publicUserSchema,
  session: publicSessionSchema,
});

export const meResponseSchema = z.object({
  user: publicUserSchema,
});