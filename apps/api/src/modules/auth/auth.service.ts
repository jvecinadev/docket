import bcrypt from "bcrypt";
import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@docket/db";
import {
  AUTH_SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  type AuthResponse,
  type LoginBody,
  type PublicSession,
  type PublicUser,
  type RegisterBody,
} from "@docket/types";
import { AppError } from "../../utils/app-error";
import {
  authRepository,
  type SessionPublicRow,
  type UserPublicRow,
  type UserForLoginRow,
} from "./auth.repository";

const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

const hashToken = (token: string) => {
  return createHash("sha256").update(token).digest("hex");
};

const generateSessionToken = () => {
  return randomBytes(32).toString("hex");
};

const toPublicUser = (user: UserPublicRow): PublicUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  emailVerifiedAt: user.emailVerifiedAt ? user.emailVerifiedAt.toISOString() : null,
  lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt.toISOString(),
});

const toPublicSession = (session: SessionPublicRow): PublicSession => ({
  id: session.id,
  ipAddress: session.ipAddress,
  userAgent: session.userAgent,
  lastUsedAt: session.lastUsedAt ? session.lastUsedAt.toISOString() : null,
  expiresAt: session.expiresAt.toISOString(),
  revokedAt: session.revokedAt ? session.revokedAt.toISOString() : null,
  createdAt: session.createdAt.toISOString(),
});

const buildSessionExpiry = () => {
  return new Date(Date.now() + SESSION_MAX_AGE_MS);
};

const createAuthResponse = (user: UserPublicRow, session: SessionPublicRow): AuthResponse => {
  return {
    user: toPublicUser(user),
    session: toPublicSession(session),
  };
};

export const authService = {
  register: async (
    input: RegisterBody,
    meta: {
      ipAddress: string | null;
      userAgent: string | null;
    }
  ) => {
    const existing = await authRepository.findUserByEmail(input.email);

    if (existing) {
      throw new AppError(409, "Email already registered");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const sessionToken = generateSessionToken();
    const tokenHash = hashToken(sessionToken);

    const result = await prisma.$transaction(async (tx) => {
      const user = await authRepository.createUser(tx, {
        email: input.email,
        name: input.name,
        passwordHash,
      });

      const session = await authRepository.createSession(tx, {
        userId: user.id,
        tokenHash,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        expiresAt: buildSessionExpiry(),
      });

      return { user, session };
    });

    return {
      ...createAuthResponse(result.user, result.session),
      sessionToken,
    };
  },

  login: async (
    input: LoginBody,
    meta: {
      ipAddress: string | null;
      userAgent: string | null;
    }
  ) => {
    const user = await authRepository.findUserByEmail(input.email);

    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new AppError(423, "Account temporarily locked");
    }

    const validPassword = await bcrypt.compare(input.password, user.passwordHash);

    if (!validPassword) {
      const failedLoginCount = user.failedLoginCount + 1;
      const lockedUntil =
        failedLoginCount >= MAX_FAILED_LOGIN_ATTEMPTS
          ? new Date(Date.now() + LOCK_DURATION_MS)
          : null;

      await authRepository.updateLoginFailure(prisma, user.id, failedLoginCount, lockedUntil);

      throw new AppError(401, "Invalid email or password");
    }

    const sessionToken = generateSessionToken();
    const tokenHash = hashToken(sessionToken);

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await authRepository.updateLoginSuccess(tx, user.id);

      const session = await authRepository.createSession(tx, {
        userId: user.id,
        tokenHash,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        expiresAt: buildSessionExpiry(),
      });

      return { user: updatedUser, session };
    });

    return {
      ...createAuthResponse(result.user, result.session),
      sessionToken,
    };
  },

  logout: async (sessionToken: string | null | undefined) => {
    if (!sessionToken) {
      return;
    }

    const tokenHash = hashToken(sessionToken);
    await authRepository.revokeSessionByTokenHash(prisma, tokenHash);
  },

  getCurrentUser: async (userId: string) => {
    const user = await authRepository.findUserById(userId);

    if (!user) {
      throw new AppError(404, "User not found");
    }

    return toPublicUser(user);
  },
};