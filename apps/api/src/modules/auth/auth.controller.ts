import type { NextFunction, Request, Response } from "express";
import {
  changePasswordBodySchema,
  loginBodySchema,
  logoutAllBodySchema,
  logoutBodySchema,
  loginBodySchema as _loginBodySchema,
  meResponseSchema,
  registerBodySchema,
  refreshBodySchema,
  requestEmailVerificationBodySchema,
  requestPasswordResetBodySchema,
  resetPasswordBodySchema,
  revokeSessionBodySchema,
  sessionListResponseSchema,
  verifyEmailBodySchema,
} from "@docket/types";
import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";
import { authService } from "./auth.service";
import {
  clearSessionCookie,
  extractSessionToken,
  setSessionCookie,
} from "./auth.utils";

const getRequestMeta = (req: Request) => {
  return {
    ipAddress: req.ip ?? null,
    userAgent: req.get("user-agent") ?? null,
    requestId: req.get("x-request-id") ?? null,
  };
};

const requireAuthContext = (req: Request) => {
  if (!req.auth) {
    throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
  }

  return req.auth;
};

const sendAuthSessionResponse = (
  res: Response,
  result: {
    user: unknown;
    session: unknown;
    sessionToken: string;
    verificationToken?: string;
  },
  status = 200
) => {
  setSessionCookie(res, result.sessionToken);

  const payload: Record<string, unknown> = {
    user: result.user,
    session: result.session,
  };

  if (env.NODE_ENV !== "production" && result.verificationToken) {
    payload.verificationToken = result.verificationToken;
  }

  return res.status(status).json(payload);
};

export const authController = {
  register: async (
    req: Request<unknown, unknown, typeof registerBodySchema._input>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await authService.register(req.body, getRequestMeta(req));
      return sendAuthSessionResponse(res, result, 201);
    } catch (error) {
      next(error);
    }
  },

  login: async (
    req: Request<unknown, unknown, typeof loginBodySchema._input>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await authService.login(req.body, getRequestMeta(req));
      return sendAuthSessionResponse(res, result);
    } catch (error) {
      next(error);
    }
  },

  refresh: async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = extractSessionToken(_req);
      const result = await authService.refresh(sessionToken, getRequestMeta(_req));
      return sendAuthSessionResponse(res, result);
    } catch (error) {
      next(error);
    }
  },

  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = extractSessionToken(req);
      await authService.logout(sessionToken, getRequestMeta(req));
      clearSessionCookie(res);
      return res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },

  logoutAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      await authService.logoutAll(auth.user.id, getRequestMeta(req));
      clearSessionCookie(res);
      return res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },

  me: async (req: Request, res: Response) => {
    const auth = requireAuthContext(req);
    return res.json({ user: auth.user });
  },

  listSessions: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const auth = requireAuthContext(req);
      const sessions = await authService.listSessions(auth.user.id);
      return res.json({ sessions });
    } catch (error) {
      next(error);
    }
  },

  revokeSession: async (
    req: Request<unknown, unknown, typeof revokeSessionBodySchema._input>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const auth = requireAuthContext(req);
      await authService.revokeSession(auth.user.id, req.body.sessionId, getRequestMeta(req));

      if (req.body.sessionId === auth.session.id) {
        clearSessionCookie(res);
      }

      return res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },

  changePassword: async (
    req: Request<unknown, unknown, typeof changePasswordBodySchema._input>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const auth = requireAuthContext(req);
      const result = await authService.changePassword(
        req.body,
        auth.user.id,
        auth.session.id,
        getRequestMeta(req)
      );

      return sendAuthSessionResponse(res, result);
    } catch (error) {
      next(error);
    }
  },

  requestPasswordReset: async (
    req: Request<unknown, unknown, typeof requestPasswordResetBodySchema._input>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await authService.requestPasswordReset(req.body, getRequestMeta(req));

      const payload: Record<string, unknown> = { ok: true };

      if (env.NODE_ENV !== "production" && result.resetToken) {
        payload.resetToken = result.resetToken;
      }

      return res.json(payload);
    } catch (error) {
      next(error);
    }
  },

  resetPassword: async (
    req: Request<unknown, unknown, typeof resetPasswordBodySchema._input>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await authService.resetPassword(req.body, getRequestMeta(req));
      clearSessionCookie(res);
      return res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },

  requestEmailVerification: async (
    req: Request<unknown, unknown, typeof requestEmailVerificationBodySchema._input>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await authService.requestEmailVerification(req.body, getRequestMeta(req));

      const payload: Record<string, unknown> = { ok: true };

      if (env.NODE_ENV !== "production" && result.verificationToken) {
        payload.verificationToken = result.verificationToken;
      }

      return res.json(payload);
    } catch (error) {
      next(error);
    }
  },

  verifyEmail: async (
    req: Request<unknown, unknown, typeof verifyEmailBodySchema._input>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      await authService.verifyEmail(req.body, getRequestMeta(req));
      return res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },
};