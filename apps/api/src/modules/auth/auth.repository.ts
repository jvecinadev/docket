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

export const userForLoginSelect = {
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

type DbClient = PrismaClient | Prisma.TransactionClient;

export type UserForLoginRow = Prisma.UserGetPayload<{
  select: typeof userForLoginSelect;
}>;

export type UserPublicRow = Prisma.UserGetPayload<{
  select: typeof userPublicSelect;
}>;

export type SessionPublicRow = Prisma.SessionGetPayload<{
  select: typeof sessionPublicSelect;
}>;

export type SessionWithUserRow = Prisma.SessionGetPayload<{
  select: typeof sessionWithUserSelect;
}>;

export const authRepository = {
  findUserByEmail: async (email: string) => {
    return prisma.user.findUnique({
      where: { email },
      select: userForLoginSelect,
    });
  },

  findUserById: async (id: string) => {
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

  createSession: async (
    db: DbClient,
    data: {
      userId: string;
      tokenHash: string;
      ipAddress: string | null;
      userAgent: string | null;
      expiresAt: Date;
    }
  ) => {
    return db.session.create({
      data,
      select: sessionPublicSelect,
    });
  },

  findSessionWithUserByTokenHash: async (tokenHash: string) => {
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

  revokeSessionByTokenHash: async (db: DbClient, tokenHash: string) => {
    return db.session.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
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
};