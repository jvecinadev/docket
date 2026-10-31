import type { RequestHandler } from "express";
import type {
  ChangePasswordBody,
  LoginBody,
  RegisterBody,
  RequestPasswordResetBody,
  ResetPasswordBody,
  RevokeSessionBody,
  VerifyEmailBody,
} from "@docket/types";
import { authService } from "./auth.service";
import {
  clearSessionCookie,
  extractSessionToken,
  setSessionCookie,
} from "./auth.utils";

type AuthContextRequest = {
  auth?: {
    userId: string;
    sessionId: string;
  };
};

const getAuthUserId = (req: AuthContextRequest) => {
  return req.auth?.userId ?? null;
};

const getClientMeta = (req: { ip?: string; get: (name: string) => string | undefined }) => {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
  };
};

export const register: RequestHandler<any, unknown, RegisterBody> = async (
  req,
  res,
  next,
) => {
  try {
    const result = await authService.register(req.body, getClientMeta(req));
    setSessionCookie(res, result.sessionToken);

    res.status(201).json({
      user: result.user,
      session: result.session,
    });
  } catch (error) {
    next(error);
  }
};