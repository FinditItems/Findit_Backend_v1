import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

function getBearerToken(header?: string) {
  if (!header?.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim();
}

function verifyToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as Express.UserPayload;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const internalServiceKey = req.headers["x-internal-service-key"];
    if(
      env.INTERNAL_SERVICE_KEY &&
      typeof internalServiceKey === "string" &&
      internalServiceKey === env.INTERNAL_SERVICE_KEY   
    ){
      return next();
    }
    
    const token = getBearerToken(req.headers.authorization);

    if (!token) {
      return res.status(401).json({ message: "Authorization token required" });
    }

    req.user = verifyToken(token);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
