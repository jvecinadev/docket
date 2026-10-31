import { prisma } from "@docket/db";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error";
import { authRepository } from "../modules/auth/auth.repository";
import {
  extractSessionToken,
  toPublicAuthContext,
  hashToken,
} from "../modules/auth/auth.utils";

export const requireAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const sessionToken = extractSessionToken(req);

    if (!sessionToken) {
      return next(new AppError(401, "Unauthorized", "UNAUTHORIZED"));
    }

    const session = await authRepository.findActiveSessionByTokenHash(
      hashToken(sessionToken)
    );

    if (!session) {
      return next(new AppError(401, "Unauthorized", "UNAUTHORIZED"));
    }

    await authRepository.touchSession(prisma, session.id);

    req.auth = toPublicAuthContext(session);
    req.user = req.auth.user;

    return next();
  } catch {
    return next(new AppError(401, "Unauthorized", "UNAUTHORIZED"));
  }
};