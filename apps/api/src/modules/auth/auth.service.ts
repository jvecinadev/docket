import bcrypt from "bcrypt";
import type { Prisma } from "@prisma/client";
import { prisma } from "@docket/db";
import type { PublicSession, PublicUser } from "@docket/types";
import { AppError } from "../../utils/app-error";
import { auditService } from "../audit/audit.service";
import {
  authRepository,
  type SessionPublicRow,
  type SessionWithUserRow,
  type UserPublicRow,
  type UserWithSecretsRow,
} from "./auth.repository";
import {
  buildEmailVerificationExpiry,
  buildPasswordResetExpiry,
  buildSessionExpiry,
  generateOpaqueToken,
  hashToken,
  normalizeEmail,
  toPublicSession,
  toPublicUser,
} from "./auth.utils";

const AUTH_MAX_FAILED_LOGIN_ATTEMPTS = 5;
const AUTH_LOCK_DURATION_MS = 15 * 60 * 1000;

const AUTH_AUDIT_ACTIONS = {
  REGISTERED: "USER_REGISTERED",
  LOGGED_IN: "USER_LOGGED_IN",
  LOGIN_FAILED: "USER_LOGIN_FAILED",
  LOGIN_BLOCKED: "USER_LOGIN_BLOCKED",
  LOGGED_OUT: "USER_LOGGED_OUT",
  LOGGED_OUT_ALL: "USER_LOGGED_OUT_ALL",
  SESSION_REFRESHED: "SESSION_REFRESHED",
  SESSION_REVOKED: "SESSION_REVOKED",
  EMAIL_VERIFICATION_REQUESTED: "EMAIL_VERIFICATION_REQUESTED",
  EMAIL_VERIFIED: "EMAIL_VERIFIED",
  PASSWORD_RESET_REQUESTED: "PASSWORD_RESET_REQUESTED",
  PASSWORD_RESET_COMPLETED: "PASSWORD_RESET_COMPLETED",
  PASSWORD_CHANGED: "PASSWORD_CHANGED",
} as const;

type RequestMeta = {
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
};

type AuthResult = {
  user: PublicUser;
  session: PublicSession;
  sessionToken: string;
  verificationToken?: string;
};

type TokenRequestResult = {
  ok: true;
  verificationToken?: string;
  resetToken?: string;
};

const safeAuditLog = (input: {
  action: string;
  entityType: string;
  entityId?: string | null;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
  meta: RequestMeta;
}) => {
  void auditService
    .log({
      workspaceId: null,
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata as Prisma.InputJsonObject | undefined,
      ipAddress: input.meta.ipAddress,
      userAgent: input.meta.userAgent,
      requestId: input.meta.requestId,
    })
    .catch((error) => {
      console.error("Audit log failed:", error);
    });
};

const buildAuthResult = (
  user: UserPublicRow,
  session: SessionPublicRow,
  sessionToken: string,
  verificationToken?: string
): AuthResult => {
  return {
    user: toPublicUser(user),
    session: toPublicSession(session),
    sessionToken,
    verificationToken,
  };
};

const buildDevTokenResult = (tokenKey: "verificationToken" | "resetToken", token?: string) => {
  if (!token) return {};
  return {
    [tokenKey]: token,
  } as Record<string, string>;
};

export const authService = {
  register: async (input: { name: string; email: string; password: string }, meta: RequestMeta) => {
    const email = normalizeEmail(input.email);

    const existing = await authRepository.findUserByEmailWithSecrets(email);

    if (existing) {
      throw new AppError(409, "Email already registered", "EMAIL_TAKEN");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const sessionToken = generateOpaqueToken();
    const verificationToken = generateOpaqueToken();

    const result = await prisma.$transaction(async (tx) => {
      const user = await authRepository.createUser(tx, {
        email,
        name: input.name,
        passwordHash,
      });

      const activatedUser = await authRepository.updateLoginSuccess(tx, user.id);

      const session = await authRepository.createSession(tx, {
        userId: activatedUser.id,
        tokenHash: hashToken(sessionToken),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        expiresAt: buildSessionExpiry(),
        lastUsedAt: new Date(),
      });

      await authRepository.createEmailVerificationToken(tx, {
        userId: activatedUser.id,
        tokenHash: hashToken(verificationToken),
        expiresAt: buildEmailVerificationExpiry(),
      });

      return {
        user: activatedUser,
        session,
      };
    });

    safeAuditLog({
      action: AUTH_AUDIT_ACTIONS.REGISTERED,
      entityType: "User",
      entityId: result.user.id,
      actorUserId: result.user.id,
      metadata: {
        emailVerified: false,
      },
      meta,
    });

    return buildAuthResult(result.user, result.session, sessionToken, verificationToken);
  },

  login: async (input: { email: string; password: string }, meta: RequestMeta) => {
    const email = normalizeEmail(input.email);

    const user = await authRepository.findUserByEmailWithSecrets(email);

    if (!user) {
      throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      safeAuditLog({
        action: AUTH_AUDIT_ACTIONS.LOGIN_BLOCKED,
        entityType: "User",
        entityId: user.id,
        actorUserId: user.id,
        metadata: {
          lockedUntil: user.lockedUntil.toISOString(),
        },
        meta,
      });

      throw new AppError(423, "Account temporarily locked", "ACCOUNT_LOCKED");
    }

    const validPassword = await bcrypt.compare(input.password, user.passwordHash);

    if (!validPassword) {
      const failedLoginCount = user.failedLoginCount + 1;
      const lockedUntil =
        failedLoginCount >= AUTH_MAX_FAILED_LOGIN_ATTEMPTS
          ? new Date(Date.now() + AUTH_LOCK_DURATION_MS)
          : null;

      await authRepository.updateLoginFailure(prisma, user.id, failedLoginCount, lockedUntil);

      safeAuditLog({
        action: AUTH_AUDIT_ACTIONS.LOGIN_FAILED,
        entityType: "User",
        entityId: user.id,
        actorUserId: user.id,
        metadata: {
          failedLoginCount,
          lockedUntil: lockedUntil ? lockedUntil.toISOString() : null,
        },
        meta,
      });

      throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
    }

    const sessionToken = generateOpaqueToken();

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await authRepository.updateLoginSuccess(tx, user.id);

      const session = await authRepository.createSession(tx, {
        userId: user.id,
        tokenHash: hashToken(sessionToken),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        expiresAt: buildSessionExpiry(),
        lastUsedAt: new Date(),
      });

      return {
        user: updatedUser,
        session,
      };
    });

    safeAuditLog({
      action: AUTH_AUDIT_ACTIONS.LOGGED_IN,
      entityType: "Session",
      entityId: result.session.id,
      actorUserId: result.user.id,
      metadata: {
        email,
      },
      meta,
    });

    return buildAuthResult(result.user, result.session, sessionToken);
  },

  refresh: async (sessionToken: string | null | undefined, meta: RequestMeta) => {
    if (!sessionToken) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const tokenHash = hashToken(sessionToken);
    const currentSession = await authRepository.findActiveSessionByTokenHash(tokenHash);

    if (!currentSession) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const newSessionToken = generateOpaqueToken();

    const rotatedSession = await authRepository.rotateSessionToken(
      prisma,
      currentSession.id,
      hashToken(newSessionToken),
      buildSessionExpiry()
    );

    safeAuditLog({
      action: AUTH_AUDIT_ACTIONS.SESSION_REFRESHED,
      entityType: "Session",
      entityId: currentSession.id,
      actorUserId: currentSession.user.id,
      metadata: {
        rotated: true,
      },
      meta,
    });

    return buildAuthResult(
      currentSession.user,
      rotatedSession,
      newSessionToken
    );
  },

  logout: async (
    sessionToken: string | null | undefined,
    meta: RequestMeta
  ): Promise<{ revoked: boolean }> => {
    if (!sessionToken) {
      return { revoked: false };
    }

    const tokenHash = hashToken(sessionToken);
    const currentSession = await authRepository.findActiveSessionByTokenHash(tokenHash);

    if (!currentSession) {
      return { revoked: false };
    }

    await authRepository.revokeSessionByTokenHash(prisma, tokenHash);

    safeAuditLog({
      action: AUTH_AUDIT_ACTIONS.LOGGED_OUT,
      entityType: "Session",
      entityId: currentSession.id,
      actorUserId: currentSession.user.id,
      metadata: {},
      meta,
    });

    return { revoked: true };
  },

  logoutAll: async (userId: string, meta: RequestMeta) => {
    const result = await authRepository.revokeAllSessionsByUserId(prisma, userId);

    safeAuditLog({
      action: AUTH_AUDIT_ACTIONS.LOGGED_OUT_ALL,
      entityType: "User",
      entityId: userId,
      actorUserId: userId,
      metadata: {
        revokedCount: result.count,
      },
      meta,
    });

    return {
      revokedCount: result.count,
    };
  },

  listSessions: async (userId: string) => {
    const sessions = await authRepository.listActiveSessionsByUserId(userId);
    return sessions.map((session) => toPublicSession(session));
  },

  revokeSession: async (userId: string, sessionId: string, meta: RequestMeta) => {
    const existing = await authRepository.findSessionByIdAndUserId(userId, sessionId);

    if (!existing) {
      throw new AppError(404, "Session not found", "SESSION_NOT_FOUND");
    }

    await authRepository.revokeSessionById(prisma, userId, sessionId);

    safeAuditLog({
      action: AUTH_AUDIT_ACTIONS.SESSION_REVOKED,
      entityType: "Session",
      entityId: sessionId,
      actorUserId: userId,
      metadata: {},
      meta,
    });

    return { revoked: true };
  },

  changePassword: async (
    input: { currentPassword: string; newPassword: string },
    userId: string,
    currentSessionId: string,
    meta: RequestMeta
  ) => {
    const user = await authRepository.findUserByIdWithSecrets(userId);

    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    const validPassword = await bcrypt.compare(input.currentPassword, user.passwordHash);

    if (!validPassword) {
      throw new AppError(401, "Current password is incorrect", "INVALID_CREDENTIALS");
    }

    const newPasswordHash = await bcrypt.hash(input.newPassword, 12);
    const newSessionToken = generateOpaqueToken();

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await authRepository.updateUserPassword(tx, userId, newPasswordHash);

      const rotatedSession = await authRepository.rotateSessionToken(
        tx,
        currentSessionId,
        hashToken(newSessionToken),
        buildSessionExpiry()
      );

      const revokedOthers = await authRepository.revokeAllOtherSessionsByUserId(
        tx,
        userId,
        currentSessionId
      );

      await authRepository.clearPasswordResetTokensByUserId(tx, userId);

      return {
        user: updatedUser,
        session: rotatedSession,
        revokedCount: revokedOthers.count,
      };
    });

    safeAuditLog({
      action: AUTH_AUDIT_ACTIONS.PASSWORD_CHANGED,
      entityType: "User",
      entityId: userId,
      actorUserId: userId,
      metadata: {
        revokedCount: result.revokedCount,
      },
      meta,
    });

    return buildAuthResult(result.user, result.session, newSessionToken);
  },

  requestPasswordReset: async (
    input: { email: string },
    meta: RequestMeta
  ): Promise<TokenRequestResult> => {
    const email = normalizeEmail(input.email);
    const user = await authRepository.findUserByEmailWithSecrets(email);

    if (!user) {
      return { ok: true };
    }

    const resetToken = generateOpaqueToken();

    await prisma.$transaction(async (tx) => {
      await authRepository.clearPasswordResetTokensByUserId(tx, user.id);

      await authRepository.createPasswordResetToken(tx, {
        userId: user.id,
        tokenHash: hashToken(resetToken),
        expiresAt: buildPasswordResetExpiry(),
      });
    });

    safeAuditLog({
      action: AUTH_AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      entityType: "User",
      entityId: user.id,
      actorUserId: user.id,
      metadata: {},
      meta,
    });

    return {
      ok: true,
      resetToken,
    };
  },

  resetPassword: async (
    input: { token: string; password: string },
    meta: RequestMeta
  ) => {
    const tokenHash = hashToken(input.token);
    const resetToken = await authRepository.findValidPasswordResetTokenByHash(tokenHash);

    if (!resetToken) {
      throw new AppError(400, "Invalid or expired reset token", "INVALID_TOKEN");
    }

    const newPasswordHash = await bcrypt.hash(input.password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await authRepository.updateUserPassword(
        tx,
        resetToken.userId,
        newPasswordHash
      );

      const consumed = await authRepository.consumePasswordResetToken(tx, resetToken.id);
      const revokedSessions = await authRepository.revokeAllSessionsByUserId(
        tx,
        resetToken.userId
      );

      return {
        user: updatedUser,
        consumed,
        revokedCount: revokedSessions.count,
      };
    });

    safeAuditLog({
      action: AUTH_AUDIT_ACTIONS.PASSWORD_RESET_COMPLETED,
      entityType: "User",
      entityId: resetToken.userId,
      actorUserId: resetToken.userId,
      metadata: {
        revokedCount: result.revokedCount,
      },
      meta,
    });

    return { ok: true };
  },

  requestEmailVerification: async (
    input: { email: string },
    meta: RequestMeta
  ): Promise<TokenRequestResult> => {
    const email = normalizeEmail(input.email);
    const user = await authRepository.findUserByEmailWithSecrets(email);

    if (!user || user.emailVerifiedAt) {
      return { ok: true };
    }

    const verificationToken = generateOpaqueToken();

    await prisma.$transaction(async (tx) => {
      await authRepository.clearEmailVerificationTokensByUserId(tx, user.id);

      await authRepository.createEmailVerificationToken(tx, {
        userId: user.id,
        tokenHash: hashToken(verificationToken),
        expiresAt: buildEmailVerificationExpiry(),
      });
    });

    safeAuditLog({
      action: AUTH_AUDIT_ACTIONS.EMAIL_VERIFICATION_REQUESTED,
      entityType: "User",
      entityId: user.id,
      actorUserId: user.id,
      metadata: {},
      meta,
    });

    return {
      ok: true,
      verificationToken,
    };
  },

  verifyEmail: async (
    input: { token: string },
    meta: RequestMeta
  ) => {
    const tokenHash = hashToken(input.token);
    const verificationToken = await authRepository.findValidEmailVerificationTokenByHash(
      tokenHash
    );

    if (!verificationToken) {
      throw new AppError(400, "Invalid or expired verification token", "INVALID_TOKEN");
    }

    await prisma.$transaction(async (tx) => {
      await authRepository.markUserEmailVerified(tx, verificationToken.userId);
      await authRepository.consumeEmailVerificationToken(tx, verificationToken.id);
    });

    safeAuditLog({
      action: AUTH_AUDIT_ACTIONS.EMAIL_VERIFIED,
      entityType: "User",
      entityId: verificationToken.userId,
      actorUserId: verificationToken.userId,
      metadata: {},
      meta,
    });

    return { ok: true };
  },
};