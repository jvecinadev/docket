import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { env } from "../config/env";
import { AppError } from "../utils/app-error";

const isJsonSyntaxError = (err: unknown): err is SyntaxError => {
  return err instanceof SyntaxError && "body" in err;
};

const buildValidationDetails = (error: ZodError) => {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
    code: issue.code,
  }));
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (isJsonSyntaxError(err)) {
    return res.status(400).json({
      error: "Invalid JSON payload",
      code: "INVALID_JSON",
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: buildValidationDetails(err),
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case "P2002":
        return res.status(409).json({
          error: "Duplicate record",
          code: "DUPLICATE_RECORD",
        });

      case "P2003":
        return res.status(400).json({
          error: "Invalid relation reference",
          code: "INVALID_FOREIGN_KEY",
        });

      case "P2025":
        return res.status(404).json({
          error: "Record not found",
          code: "RECORD_NOT_FOUND",
        });

      default:
        return res.status(400).json({
          error: "Database request failed",
          code: err.code,
        });
    }
  }

  console.error("Unhandled error:", {
    method: req.method,
    path: req.originalUrl,
    error: err,
  });

  return res.status(500).json({
    error:
      env.NODE_ENV === "production"
        ? "Internal server error"
        : "Unexpected server error",
    code: "INTERNAL_SERVER_ERROR",
  });
};