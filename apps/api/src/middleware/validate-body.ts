import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";

export const validateBody = <T extends ZodTypeAny>(schema: T): RequestHandler => {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        message: "Invalid request body",
        issues: parsed.error.flatten(),
      });
      return;
    }

    req.body = parsed.data;
    next();
  };
};