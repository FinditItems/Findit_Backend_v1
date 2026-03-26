import { NextFunction, Response } from "express";
import { PostStatus, PostType, Prisma } from "@prisma/client";
import { prisma } from "../config/db";
import { AuthenticatedRequest } from "../middlewares/auth";
import { findMatchesForPost, notifyPossibleMatch } from "../services/internalServices";

const postUserSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
} as const;

const postInclude = {
  user: {
    select: postUserSelect,
  },
} as const;

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parsePostType(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toUpperCase();
  return normalized === PostType.LOST || normalized === PostType.FOUND ? normalized : null;
}

function parsePostStatus(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.toUpperCase();
  return normalized === PostStatus.OPEN || normalized === PostStatus.CLOSED ? normalized : null;
}

function parseDateInput(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function createPost(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const type = parsePostType(req.body?.type);
    const category = normalizeString(req.body?.category);
    const location = normalizeString(req.body?.location);
    const date = parseDateInput(req.body?.date);
    const description = normalizeString(req.body?.description);
    const imageUrl = normalizeString(req.body?.imageUrl) || null;

    if (!req.user?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!type || !category || !location || !date || !description) {
      return res.status(400).json({
        message: "type, category, location, date, description are required",
      });
    }

    const post = await prisma.post.create({
      data: {
        type,
        category,
        location,
        date,
        description,
        imageUrl,
        userId: req.user.userId,
      },
      include: postInclude,
    });

    const matches = await findMatchesForPost({
      id: post.id,
      type: post.type,
      category: post.category,
      location: post.location,
      date: post.date,
      description: post.description,
      imageUrl: post.imageUrl,
      status: post.status,
      userId: post.userId,
    });

    if (matches.length > 0) {
      await notifyPossibleMatch({
        userId: post.userId,
        postId: post.id,
        matches,
      });
    }

    return res.status(201).json({
      post,
      matches,
    });
  } catch (err) {
    return next(err);
  }
}

export async function listPosts(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const type = parsePostType(req.query.type);
    const status = parsePostStatus(req.query.status);
    const category = normalizeString(req.query.category);
    const location = normalizeString(req.query.location);
    const query = normalizeString(req.query.q);
    const mine = String(req.query.mine || "").toLowerCase() === "true";

    if (req.query.type && !type) {
      return res.status(400).json({ message: "Invalid type filter" });
    }

    if (req.query.status && !status) {
      return res.status(400).json({ message: "Invalid status filter" });
    }

    if (mine && !req.user?.userId) {
      return res.status(401).json({ message: "Authentication required for mine=true" });
    }

    const where: Prisma.PostWhereInput = {
      ...(type ? { type } : {}),
      ...(status ? { status } : {}),
      ...(category
        ? {
            category: {
              contains: category,
              mode: "insensitive",
            },
          }
        : {}),
      ...(location
        ? {
            location: {
              contains: location,
              mode: "insensitive",
            },
          }
        : {}),
      ...(mine && req.user?.userId ? { userId: req.user.userId } : {}),
      ...(query
        ? {
            OR: [
              {
                category: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                location: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };

    const posts = await prisma.post.findMany({
      where,
      include: postInclude,
      orderBy: { createdAt: "desc" },
    });

    return res.json({ count: posts.length, posts });
  } catch (err) {
    return next(err);
  }
}

export async function getPostById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
      include: postInclude,
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    return res.json({ post });
  } catch (err) {
    return next(err);
  }
}

export async function closePost(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const isAdmin = req.user?.role?.toLowerCase() === "admin";
    const isOwner = req.user?.userId === post.userId;

    if (!req.isInternalService && !isAdmin && !isOwner) {
      return res.status(403).json({ message: "Not allowed to close this post" });
    }

    if (post.status === PostStatus.CLOSED) {
      const existingPost = await prisma.post.findUnique({
        where: { id: post.id },
        include: postInclude,
      });

      return res.json({
        message: "Post already closed",
        post: existingPost,
      });
    }

    const updatedPost = await prisma.post.update({
      where: { id: post.id },
      data: { status: PostStatus.CLOSED },
      include: postInclude,
    });

    return res.json({
      message: "Post closed successfully",
      post: updatedPost,
    });
  } catch (err) {
    return next(err);
  }
}

export async function deletePost(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const post = await prisma.post.findUnique({
      where: { id: req.params.id },
    });

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const isAdmin = req.user?.role?.toLowerCase() === "admin";
    const isOwner = req.user?.userId === post.userId;

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: "Not allowed to delete this post" });
    }

    await prisma.post.delete({
      where: { id: post.id },
    });

    return res.status(200).json({ message: "Post deleted successfully" });
  } catch (err) {
    return next(err);
  }
}
