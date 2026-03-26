import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

type JwtPayload = {
  userId: string;
  email: string;
  role: string;
};

export type AuthenticatedRequest = Request & {
  user?: JwtPayload;
  isInternalService?: boolean;
};

function getBearerToken(header?: string) {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim();
}

function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ message: "Authorization token required" });
    }

    req.user = verifyJwt(token);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      return next();
    }

    req.user = verifyJwt(token);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

export function requireAuthOrInternal(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const internalKey = req.header("x-internal-service-key");

  if (env.INTERNAL_SERVICE_KEY && internalKey === env.INTERNAL_SERVICE_KEY) {
    req.isInternalService = true;
    return next();
  }

  return requireAuth(req, res, next);
}
