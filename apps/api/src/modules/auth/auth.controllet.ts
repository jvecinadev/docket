import type { NextFunction, Request, Response } from "express";
import {
  AUTH_SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
  type LoginBody,
  type RegisterBody,
} from "@docket/types";
import { env } from "../../config/env";
import { authService } from "./auth.service";

const buildCookieOptions = () => {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
    path: "/",
    maxAge: SESSION_MAX_AGE_MS,
  };
};

const buildClearCookieOptions = () => {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
    path: "/",
  };
};

export const authController = {
  register: async (
    req: Request<unknown, unknown, RegisterBody>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await authService.register(req.body, {
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      });

      res.cookie(AUTH_SESSION_COOKIE_NAME, result.sessionToken, buildCookieOptions());
      res.status(201).json({
        user: result.user,
        session: result.session,
      });
    } catch (error) {
      next(error);
    }
  },

  login: async (
    req: Request<unknown, unknown, LoginBody>,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const result = await authService.login(req.body, {
        ipAddress: req.ip ?? null,
        userAgent: req.get("user-agent") ?? null,
      });

      res.cookie(AUTH_SESSION_COOKIE_NAME, result.sessionToken, buildCookieOptions());
      res.json({
        user: result.user,
        session: result.session,
      });
    } catch (error) {
      next(error);
    }
  },

  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = req.cookies?.[AUTH_SESSION_COOKIE_NAME] as string | undefined;

      await authService.logout(sessionToken);

      res.clearCookie(AUTH_SESSION_COOKIE_NAME, buildClearCookieOptions());
      res.json({ ok: true });
    } catch (error) {
      next(error);
    }
  },

  me: async (req: Request, res: Response) => {
    res.json({ user: req.user });
  },
};