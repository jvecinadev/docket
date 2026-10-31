import { AUTH_SESSION_COOKIE_NAME, AUTH_SESSION_MAX_AGE_MS } from "@docket/types";
import type { PublicSession, PublicUser } from "@docket/types";
import type { CookieOptions, Request, Response } from "express";
import { createHash, randomBytes } from "node:crypto";
import { env } from "../../config/env";
import type {
  SessionPublicRow,
  SessionWithUserRow,
  UserPublicRow,
} from "./auth.repository";

const EMAIL_VERIFICATION_TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 24; // 24h
const PASSWORD_RESET_TOKEN_MAX_AGE_MS = 1000 * 60 * 60; // 1h

export const normalizeEmail = (email: string) => {
  return email.trim().toLowerCase();
};

export const generateOpaqueToken = () => {
  return randomBytes(32).toString("hex");
};

export const hashToken = (token: string) => {
  return createHash("sha256").update(token).digest("hex");
};

export const buildSessionExpiry = () => {
  return new Date(Date.now() + AUTH_SESSION_MAX_AGE_MS);
};

export const buildEmailVerificationExpiry = () => {
  return new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_MAX_AGE_MS);
};

export const buildPasswordResetExpiry = () => {
  return new Date(Date.now() + PASSWORD_RESET_TOKEN_MAX_AGE_MS);
};

export const toPublicUser = (user: UserPublicRow): PublicUser => {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
};

export const toPublicSession = (session: SessionPublicRow): PublicSession => {
  return {
    id: session.id,
    ipAddress: session.ipAddress,
    userAgent: session.userAgent,
    lastUsedAt: session.lastUsedAt ? session.lastUsedAt.toISOString() : null,
    expiresAt: session.expiresAt.toISOString(),
    revokedAt: session.revokedAt ? session.revokedAt.toISOString() : null,
    createdAt: session.createdAt.toISOString(),
  };
};

export const toPublicAuthContext = (session: SessionWithUserRow) => {
  return {
    user: toPublicUser(session.user),
    session: toPublicSession(session),
  };
};

export const buildSessionCookieOptions = (): CookieOptions => {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: AUTH_SESSION_MAX_AGE_MS,
  };
};

export const buildClearSessionCookieOptions = (): CookieOptions => {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
    path: "/",
  };
};

export const setSessionCookie = (res: Response, sessionToken: string) => {
  res.cookie(AUTH_SESSION_COOKIE_NAME, sessionToken, buildSessionCookieOptions());
};

export const clearSessionCookie = (res: Response) => {
  res.clearCookie(AUTH_SESSION_COOKIE_NAME, buildClearSessionCookieOptions());
};

export const extractSessionToken = (req: Request) => {
  const cookieToken = req.cookies?.[AUTH_SESSION_COOKIE_NAME];

  if (typeof cookieToken === "string" && cookieToken.length > 0) {
    return cookieToken;
  }

  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    return token.length > 0 ? token : null;
  }

  return null;
};