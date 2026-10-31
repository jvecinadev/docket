import type { NextFunction, Request, Response } from "express";
import { AUTH_SESSION_COOKIE_NAME } from "@docket/types";
import { authRepository } from "../modules/auth/auth.repository";
import { AppError } from "../utils/app-error";
import { createHash } from "node:crypto";

const hashToken = (token: string) => {
  return createHash("sha256").update(token).digest("hex");
};

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const sessionToken = req.cookies?.[AUTH_SESSION_COOKIE_NAME] as string | undefined;

    if (!sessionToken) {
      return next(new AppError(401, "Unauthorized"));
    }

    const session = await authRepository.findSessionWithUserByTokenHash(
      hashToken(sessionToken)
    );

    if (!session) {
      return next(new AppError(401, "Unauthorized"));
    }

    await authRepository.touchSession(require("@docket/db").prisma, session.id);

    req.user = {
      ...session.user,
      emailVerifiedAt: session.user.emailVerifiedAt?.toISOString() ?? null,
      lastLoginAt: session.user.lastLoginAt?.toISOString() ?? null,
      createdAt: session.user.createdAt.toISOString(),
      updatedAt: session.user.updatedAt.toISOString(),
    };
    next();
  } catch {
    next(new AppError(401, "Unauthorized"));
  }
};