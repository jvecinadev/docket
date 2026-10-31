import { prisma } from "@docket/db";
import {
  AUTH_LOCK_DURATION_MS,
  AUTH_MAX_FAILED_LOGIN_ATTEMPTS,
  type ChangePasswordBody,
  type LoginBody,
  type PublicSession,
  type PublicUser,
  type RegisterBody,
  type RequestPasswordResetBody,
  type ResetPasswordBody,
  type VerifyEmailBody,
} from "@docket/types";
import type { Prisma, PrismaClient } from "@prisma/client";
import { pbkdf2 as pbkdf2Callback, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
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
import { authRepository } from "./auth.repository";

const pbkdf2 = promisify(pbkdf2Callback);

type DbClient = PrismaClient | Prisma.TransactionClient;

type SessionMeta = {
  ipAddress: string | null;
  userAgent: string | null;
};

type AuthResult = {
  user: PublicUser;
  session: PublicSession;
  sessionToken: string;
};

const PASSWORD_ITERATIONS = 210_000;
const PASSWORD_KEYLEN = 32;
const PASSWORD_DIGEST = "sha512";

const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const derived = (await pbkdf2(
    password,
    salt,
    PASSWORD_ITERATIONS,
    PASSWORD_KEYLEN,
    PASSWORD_DIGEST,
  )) as Buffer;

  return `pbkdf2$${PASSWORD_ITERATIONS}$${salt}$${derived.toString("hex")}`;
};

const verifyPassword = async (password: string, storedHash: string) => {
  const [scheme, iterationsStr, salt, expectedHex] = storedHash.split("$");

  if (
    scheme !== "pbkdf2" ||
    !iterationsStr ||
    !salt ||
    !expectedHex ||
    Number.isNaN(Number(iterationsStr))
  ) {
    return false;
  }

  const iterations = Number(iterationsStr);
  const expected = Buffer.from(expectedHex, "hex");

  const derived = (await pbkdf2(
    password,
    salt,
    iterations,
    expected.length,
    PASSWORD_DIGEST,
  )) as Buffer;

  if (derived.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(derived, expected);
};

const createSessionResult = async (
  db: DbClient,
  userId: string,
  meta: SessionMeta,
): Promise<{ session: PublicSession; sessionToken: string }> => {
  const sessionToken = generateOpaqueToken();

  const session = await authRepository.createSession(db, {
    userId,
    tokenHash: hashToken(sessionToken),
    ipAddress: meta.ipAddress,
    userAgent: meta.userAgent,
    expiresAt: buildSessionExpiry(),
  });

  return {
    session: toPublicSession(session),
    sessionToken,
  };
};

export const authService = {
  register: async (input: RegisterBody, meta: SessionMeta): Promise<AuthResult> => {
    const email = normalizeEmail(input.email);

    const existingUser = await authRepository.findUserByEmailWithSecrets(email);
    if (existingUser) {
      throw new Error("Email already in use");
    }

    const passwordHash = await hashPassword(input.password);
    const name = input.name.trim();

    const result = await prisma.$transaction(async (tx) => {
      const createdUser = await authRepository.createUser(tx, {
        email,
        name,
        passwordHash,
      });

      const updatedUser = await authRepository.updateLoginSuccess(tx, createdUser.id);
      const { session, sessionToken } = await createSessionResult(tx, createdUser.id, meta);

      return {
        user: toPublicUser(updatedUser),
        session,
        sessionToken,
      };
    });

    return result;
  },

  login: async (input: LoginBody, meta: SessionMeta): Promise<AuthResult> => {
    const email = normalizeEmail(input.email);
    const user = await authRepository.findUserByEmailWithSecrets(email);

    if (!user) {
      throw new Error("Invalid credentials");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new Error("Account is temporarily locked");
    }

    const validPassword = await verifyPassword(input.password, user.passwordHash);
    if (!validPassword) {
      const failedCount = (user.failedLoginCount ?? 0) + 1;
      const lockedUntil =
        failedCount >= AUTH_MAX_FAILED_LOGIN_ATTEMPTS
          ? new Date(Date.now() + AUTH_LOCK_DURATION_MS)
          : null;

      await authRepository.updateLoginFailure(prisma, user.id, failedCount, lockedUntil);
      throw new Error("Invalid credentials");
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await authRepository.updateLoginSuccess(tx, user.id);
      const { session, sessionToken } = await createSessionResult(tx, user.id, meta);

      return {
        user: toPublicUser(updatedUser),
        session,
        sessionToken,
      };
    });

    return result;
  },

  refresh: async (sessionToken: string): Promise<AuthResult> => {
    const tokenHash = hashToken(sessionToken);
    const session = await authRepository.findActiveSessionByTokenHash(tokenHash);

    if (!session) {
      throw new Error("Invalid session");
    }

    const nextToken = generateOpaqueToken();

    const rotatedSession = await prisma.$transaction(async (tx) => {
      return authRepository.rotateSessionToken(
        tx,
        session.id,
        hashToken(nextToken),
        buildSessionExpiry(),
      );
    });

    return {
      user: toPublicUser(session.user),
      session: toPublicSession(rotatedSession),
      sessionToken: nextToken,
    };
  },

  logout: async (sessionToken: string): Promise<void> => {
    const tokenHash = hashToken(sessionToken);
    await authRepository.revokeSessionByTokenHash(prisma, tokenHash);
  },

  logoutAll: async (userId: string): Promise<void> => {
    await authRepository.revokeAllSessionsByUserId(prisma, userId);
  },

  me: async (userId: string): Promise<PublicUser> => {
    const user = await authRepository.findPublicUserById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    return toPublicUser(user);
  },

  listSessions: async (userId: string): Promise<PublicSession[]> => {
    const sessions = await authRepository.listActiveSessionsByUserId(userId);
    return sessions.map(toPublicSession);
  },

  revokeSession: async (userId: string, sessionId: string): Promise<void> => {
    const session = await authRepository.findSessionByIdAndUserId(userId, sessionId);

    if (!session) {
      throw new Error("Session not found");
    }

    await authRepository.revokeSessionById(prisma, userId, sessionId);
  },

  changePassword: async (userId: string, input: ChangePasswordBody): Promise<void> => {
    const user = await authRepository.findUserByIdWithSecrets(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const validCurrentPassword = await verifyPassword(
      input.currentPassword,
      user.passwordHash,
    );

    if (!validCurrentPassword) {
      throw new Error("Current password is incorrect");
    }

    const nextPasswordHash = await hashPassword(input.newPassword);

    await prisma.$transaction(async (tx) => {
      await authRepository.updateUserPassword(tx, userId, nextPasswordHash);
      await authRepository.revokeAllSessionsByUserId(tx, userId);
    });
  },

  requestPasswordReset: async (input: RequestPasswordResetBody): Promise<void> => {
    const email = normalizeEmail(input.email);
    const user = await authRepository.findUserByEmailWithSecrets(email);

    if (!user) {
      return;
    }

    const token = generateOpaqueToken();

    await prisma.$transaction(async (tx) => {
      await authRepository.clearPasswordResetTokensByUserId(tx, user.id);
      await authRepository.createPasswordResetToken(tx, {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: buildPasswordResetExpiry(),
      });
    });

    // Send `token` via email in your mailer layer.
  },

  confirmPasswordReset: async (input: ResetPasswordBody): Promise<void> => {
    const tokenHash = hashToken(input.token);
    const token = await authRepository.findValidPasswordResetTokenByHash(tokenHash);

    if (!token) {
      throw new Error("Invalid or expired reset token");
    }

    const nextPasswordHash = await hashPassword(input.newPassword);

    await prisma.$transaction(async (tx) => {
      await authRepository.consumePasswordResetToken(tx, token.id);
      await authRepository.updateUserPassword(tx, token.userId, nextPasswordHash);
      await authRepository.revokeAllSessionsByUserId(tx, token.userId);
      await authRepository.clearPasswordResetTokensByUserId(tx, token.userId);
    });
  },

  requestEmailVerification: async (userId: string): Promise<void> => {
    const user = await authRepository.findPublicUserById(userId);

    if (!user) {
      throw new Error("User not found");
    }

    const token = generateOpaqueToken();

    await prisma.$transaction(async (tx) => {
      await authRepository.clearEmailVerificationTokensByUserId(tx, userId);
      await authRepository.createEmailVerificationToken(tx, {
        userId,
        tokenHash: hashToken(token),
        expiresAt: buildEmailVerificationExpiry(),
      });
    });

    // Send `token` via email in your mailer layer.
  },

  confirmEmailVerification: async (input: VerifyEmailBody): Promise<void> => {
    const tokenHash = hashToken(input.token);
    const token = await authRepository.findValidEmailVerificationTokenByHash(tokenHash);

    if (!token) {
      throw new Error("Invalid or expired verification token");
    }

    await prisma.$transaction(async (tx) => {
      await authRepository.consumeEmailVerificationToken(tx, token.id);
      await authRepository.markUserEmailVerified(tx, token.userId);
      await authRepository.clearEmailVerificationTokensByUserId(tx, token.userId);
    });
  },
};