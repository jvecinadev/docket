import { prisma } from "@docket/db";
import type { Prisma, PrismaClient } from "@prisma/client";

export const userPublicSelect = {
  id: true,
  email: true,
  name: true,
  emailVerifiedAt: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const userWithSecretsSelect = {
  ...userPublicSelect,
  passwordHash: true,
  failedLoginCount: true,
  lockedUntil: true,
} as const;

export const sessionPublicSelect = {
  id: true,
  ipAddress: true,
  userAgent: true,
  lastUsedAt: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
} as const;

export const sessionWithUserSelect = {
  ...sessionPublicSelect,
  user: {
    select: userPublicSelect,
  },
} as const;

export const emailVerificationTokenSelect = {
  id: true,
  userId: true,
  tokenHash: true,
  expiresAt: true,
  consumedAt: true,
  createdAt: true,
} as const;

export const passwordResetTokenSelect = {
  id: true,
  userId: true,
  tokenHash: true,
  expiresAt: true,
  consumedAt: true,
  createdAt: true,
} as const;

type DbClient = PrismaClient | Prisma.TransactionClient;

export type UserPublicRow = Prisma.UserGetPayload<{
  select: typeof userPublicSelect;
}>;

export type UserWithSecretsRow = Prisma.UserGetPayload<{
  select: typeof userWithSecretsSelect;
}>;

export type SessionPublicRow = Prisma.SessionGetPayload<{
  select: typeof sessionPublicSelect;
}>;

export type SessionWithUserRow = Prisma.SessionGetPayload<{
  select: typeof sessionWithUserSelect;
}>;

export type EmailVerificationTokenRow = Prisma.EmailVerificationTokenGetPayload<{
  select: typeof emailVerificationTokenSelect;
}>;

export type PasswordResetTokenRow = Prisma.PasswordResetTokenGetPayload<{
  select: typeof passwordResetTokenSelect;
}>;

export const authRepository = {
  findUserByEmailWithSecrets: async (email: string) => {
    return prisma.user.findUnique({
      where: { email },
      select: userWithSecretsSelect,
    });
  },

  findUserByIdWithSecrets: async (id: string) => {
    return prisma.user.findUnique({
      where: { id },
      select: userWithSecretsSelect,
    });
  },

  findPublicUserById: async (id: string) => {
    return prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });
  },

  createUser: async (
    db: DbClient,
    data: {
      email: string;
      name: string;
      passwordHash: string;
    }
  ) => {
    return db.user.create({
      data,
      select: userPublicSelect,
    });
  },

  updateLoginSuccess: async (db: DbClient, userId: string) => {
    return db.user.update({
      where: { id: userId },
      data: {
        failedLoginCount: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
      select: userPublicSelect,
    });
  },

  updateLoginFailure: async (
    db: DbClient,
    userId: string,
    failedLoginCount: number,
    lockedUntil: Date | null
  ) => {
    return db.user.update({
      where: { id: userId },
      data: {
        failedLoginCount,
        lockedUntil,
      },
      select: userPublicSelect,
    });
  },

  updateUserPassword: async (db: DbClient, userId: string, passwordHash: string) => {
    return db.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        failedLoginCount: 0,
        lockedUntil: null,
      },
      select: userPublicSelect,
    });
  },

  markUserEmailVerified: async (db: DbClient, userId: string) => {
    return db.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
      },
      select: userPublicSelect,
    });
  },

  createSession: async (
    db: DbClient,
    data: {
      userId: string;
      tokenHash: string;
      ipAddress: string | null;
      userAgent: string | null;
      expiresAt: Date;
      lastUsedAt?: Date | null;
    }
  ) => {
    return db.session.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        expiresAt: data.expiresAt,
        lastUsedAt: data.lastUsedAt ?? new Date(),
      },
      select: sessionPublicSelect,
    });
  },

  findActiveSessionByTokenHash: async (tokenHash: string) => {
    return prisma.session.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: sessionWithUserSelect,
    });
  },

  findSessionByIdAndUserId: async (userId: string, sessionId: string) => {
    return prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      select: sessionPublicSelect,
    });
  },

  listActiveSessionsByUserId: async (userId: string) => {
    return prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      select: sessionPublicSelect,
    });
  },

  touchSession: async (db: DbClient, sessionId: string) => {
    return db.session.update({
      where: { id: sessionId },
      data: {
        lastUsedAt: new Date(),
      },
      select: sessionPublicSelect,
    });
  },

  rotateSessionToken: async (
    db: DbClient,
    sessionId: string,
    tokenHash: string,
    expiresAt: Date
  ) => {
    return db.session.update({
      where: { id: sessionId },
      data: {
        tokenHash,
        expiresAt,
        lastUsedAt: new Date(),
      },
      select: sessionPublicSelect,
    });
  },

  revokeSessionById: async (db: DbClient, userId: string, sessionId: string) => {
    return db.session.updateMany({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });
  },

  revokeSessionByTokenHash: async (db: DbClient, tokenHash: string) => {
    return db.session.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });
  },

  revokeAllSessionsByUserId: async (db: DbClient, userId: string) => {
    return db.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });
  },

  revokeAllOtherSessionsByUserId: async (
    db: DbClient,
    userId: string,
    currentSessionId: string
  ) => {
    return db.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        id: {
          not: currentSessionId,
        },
      },
      data: {
        revokedAt: new Date(),
        lastUsedAt: new Date(),
      },
    });
  },

  createEmailVerificationToken: async (
    db: DbClient,
    data: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    }
  ) => {
    return db.emailVerificationToken.create({
      data,
      select: emailVerificationTokenSelect,
    });
  },

  findValidEmailVerificationTokenByHash: async (tokenHash: string) => {
    return prisma.emailVerificationToken.findFirst({
      where: {
        tokenHash,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: emailVerificationTokenSelect,
    });
  },

  consumeEmailVerificationToken: async (db: DbClient, tokenId: string) => {
    return db.emailVerificationToken.update({
      where: { id: tokenId },
      data: {
        consumedAt: new Date(),
      },
      select: emailVerificationTokenSelect,
    });
  },

  clearEmailVerificationTokensByUserId: async (db: DbClient, userId: string) => {
    return db.emailVerificationToken.deleteMany({
      where: { userId },
    });
  },

  createPasswordResetToken: async (
    db: DbClient,
    data: {
      userId: string;
      tokenHash: string;
      expiresAt: Date;
    }
  ) => {
    return db.passwordResetToken.create({
      data,
      select: passwordResetTokenSelect,
    });
  },

  findValidPasswordResetTokenByHash: async (tokenHash: string) => {
    return prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        consumedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      select: passwordResetTokenSelect,
    });
  },

  consumePasswordResetToken: async (db: DbClient, tokenId: string) => {
    return db.passwordResetToken.update({
      where: { id: tokenId },
      data: {
        consumedAt: new Date(),
      },
      select: passwordResetTokenSelect,
    });
  },

  clearPasswordResetTokensByUserId: async (db: DbClient, userId: string) => {
    return db.passwordResetToken.deleteMany({
      where: { userId },
    });
  },
};