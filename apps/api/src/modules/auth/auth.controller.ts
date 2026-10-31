import type { RequestHandler } from "express";
import type {
  ChangePasswordBody,
  LoginBody,
  RegisterBody,
  RequestEmailVerificationBody,
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

type AuthenticatedRequest = {
  auth?: {
    userId: string;
    sessionId: string;
  };
};

type ClientMetaRequest = {
  ip?: string;
  get: (name: string) => string | undefined;
};

const getAuthUserId = (req: AuthenticatedRequest) => {
  return req.auth?.userId ?? null;
};

const getClientMeta = (req: ClientMetaRequest) => {
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
    return;
  } catch (error) {
    return next(error);
  }
};

export const login: RequestHandler<any, unknown, LoginBody> = async (
  req,
  res,
  next,
) => {
  try {
    const result = await authService.login(req.body, getClientMeta(req));

    setSessionCookie(res, result.sessionToken);

    res.status(200).json({
      user: result.user,
      session: result.session,
    });
    return;
  } catch (error) {
    return next(error);
  }
};

export const refresh: RequestHandler<any, unknown> = async (req, res, next) => {
  try {
    const sessionToken = extractSessionToken(req);

    if (!sessionToken) {
      res.status(401).json({ message: "Missing session" });
      return;
    }

    const result = await authService.refresh(sessionToken);

    setSessionCookie(res, result.sessionToken);

    res.status(200).json({
      user: result.user,
      session: result.session,
    });
    return;
  } catch (error) {
    return next(error);
  }
};

export const logout: RequestHandler<any, unknown> = async (req, res, next) => {
  try {
    const sessionToken = extractSessionToken(req);

    if (sessionToken) {
      await authService.logout(sessionToken);
    }

    clearSessionCookie(res);

    res.status(200).json({ ok: true });
    return;
  } catch (error) {
    return next(error);
  }
};

export const me: RequestHandler<any, unknown> = async (req, res, next) => {
  try {
    const userId = getAuthUserId((req as unknown as AuthenticatedRequest));

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await authService.me(userId);

    res.status(200).json({ user });
    return;
  } catch (error) {
    return next(error);
  }
};

export const listSessions: RequestHandler<any, unknown> = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getAuthUserId((req as unknown as AuthenticatedRequest));

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const sessions = await authService.listSessions(userId);

    res.status(200).json({ sessions });
    return;
  } catch (error) {
    return next(error);
  }
};

export const revokeSession: RequestHandler<any, unknown, RevokeSessionBody> =
  async (req, res, next) => {
    try {
      const userId = getAuthUserId((req as unknown as AuthenticatedRequest));

      if (!userId) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      await authService.revokeSession(userId, req.body.sessionId);

      res.status(200).json({ ok: true });
      return;
    } catch (error) {
      return next(error);
    }
  };

export const logoutAll: RequestHandler<any, unknown> = async (
  req,
  res,
  next,
) => {
  try {
    const userId = getAuthUserId((req as unknown as AuthenticatedRequest));

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    await authService.logoutAll(userId);
    clearSessionCookie(res);

    res.status(200).json({ ok: true });
    return;
  } catch (error) {
    return next(error);
  }
};

export const changePassword: RequestHandler<
  any,
  unknown,
  ChangePasswordBody
> = async (req, res, next) => {
  try {
    const userId = getAuthUserId((req as unknown as AuthenticatedRequest));

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    await authService.changePassword(userId, req.body);
    clearSessionCookie(res);

    res.status(200).json({ ok: true });
    return;
  } catch (error) {
    return next(error);
  }
};

export const requestPasswordReset: RequestHandler<
  any,
  unknown,
  RequestPasswordResetBody
> = async (req, res, next) => {
  try {
    await authService.requestPasswordReset(req.body);

    res.status(200).json({ ok: true });
    return;
  } catch (error) {
    return next(error);
  }
};

export const confirmPasswordReset: RequestHandler<
  any,
  unknown,
  ResetPasswordBody
> = async (req, res, next) => {
  try {
    await authService.confirmPasswordReset(req.body);
    clearSessionCookie(res);

    res.status(200).json({ ok: true });
    return;
  } catch (error) {
    return next(error);
  }
};

export const requestEmailVerification: RequestHandler<
  any,
  unknown,
  RequestEmailVerificationBody
> = async (req, res, next) => {
  try {
    const userId = getAuthUserId((req as unknown as AuthenticatedRequest));

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    await authService.requestEmailVerification(userId);

    res.status(200).json({ ok: true });
    return;
  } catch (error) {
    return next(error);
  }
};

export const confirmEmailVerification: RequestHandler<
  any,
  unknown,
  VerifyEmailBody
> = async (req, res, next) => {
  try {
    await authService.confirmEmailVerification(req.body);

    res.status(200).json({ ok: true });
    return;
  } catch (error) {
    return next(error);
  }
};