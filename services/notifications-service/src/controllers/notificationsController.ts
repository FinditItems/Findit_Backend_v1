import {
  NotificationType,
  Prisma,
} from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/db";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseNotificationType(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toUpperCase();
  return Object.values(NotificationType).includes(normalized as NotificationType)
    ? (normalized as NotificationType)
    : null;
}

function parseMeta(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    Array.isArray(value) ||
    (typeof value === "object" && value !== null)
  ) {
    return value as Prisma.InputJsonValue;
  }

  return undefined;
}

function parseLimit(value: unknown) {
  const raw = typeof value === "string" ? Number(value) : NaN;

  if (!value) {
    return 50;
  }

  if (!Number.isFinite(raw) || raw < 1) {
    return null;
  }

  return Math.min(raw, 100);
}

function parseUnreadOnly(value: unknown) {
  if (value === undefined) {
    return false;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toLowerCase();
  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return null;
}

export async function createNotification(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = normalizeString(req.body?.userId);
    const type = parseNotificationType(req.body?.type);
    const title = normalizeString(req.body?.title);
    const message = normalizeString(req.body?.message);
    const meta = parseMeta(req.body?.meta);

    if (!userId || !type || !title || !message) {
      return res.status(400).json({
        message: "userId, type, title, message are required",
      });
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        ...(meta !== undefined ? { meta } : {}),
      },
    });

    console.log("[notifications] created", {
      id: notification.id,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
    });

    return res.status(201).json(notification);
  } catch (err) {
    return next(err);
  }
}

export async function getMyNotifications(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const unreadOnly = parseUnreadOnly(req.query.unreadOnly);
    const limit = parseLimit(req.query.limit);

    if (unreadOnly === null) {
      return res.status(400).json({ message: "Invalid unreadOnly value" });
    }

    if (limit === null) {
      return res.status(400).json({ message: "Invalid limit value" });
    }

    const where = {
      userId: req.user.userId,
      ...(unreadOnly ? { read: false } : {}),
    };

    const items = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return res.json({
      count: items.length,
      items,
    });
  } catch (err) {
    return next(err);
  }
}

export async function markNotificationRead(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const id = normalizeString(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "Notification id required" });
    }

    const result = await prisma.notification.updateMany({
      where: {
        id,
        userId: req.user.userId,
      },
      data: {
        read: true,
      },
    });

    if (result.count === 0) {
      return res.status(404).json({ message: "Notification not found" });
    }

    return res.json({
      message: "Notification marked as read",
      updated: result.count,
    });
  } catch (err) {
    return next(err);
  }
}

export async function markAllNotificationsRead(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId: req.user.userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    return res.json({
      message: "Notifications marked as read",
      updated: result.count,
    });
  } catch (err) {
    return next(err);
  }
}
