import type { Request, Response, NextFunction } from "express";
import { type ZodTypeAny, ZodError } from "zod";
import { AppError } from "./error.js";

export function validateBody(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues
          .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
          .join(", ");
        return next(new AppError(400, "VALIDATION_ERROR", message));
      }
      return next(error);
    }
  };
}

export function validateQuery(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues
          .map((issue) => `${issue.path.join(".") || "query"}: ${issue.message}`)
          .join(", ");
        return next(new AppError(400, "VALIDATION_ERROR", message));
      }
      return next(error);
    }
  };
}

export function validateParams(schema: ZodTypeAny) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.issues
          .map((issue) => `${issue.path.join(".") || "params"}: ${issue.message}`)
          .join(", ");
        return next(new AppError(400, "VALIDATION_ERROR", message));
      }
      return next(error);
    }
  };
}
