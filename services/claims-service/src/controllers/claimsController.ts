import { NextFunction, Response } from "express";
import { prisma } from "../config/db";
import { AuthenticatedRequest } from "../middlewares/auth";
import {
  getPostById,
  closePost,
  createNotification,
} from "../services/internalServices";

export async function submitClaim(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const { postId, message, proof } = req.body;

    if (!req.user?.userId) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!postId) {
      return res.status(400).json({ message: "postId is required" });
    }

    const post = await getPostById(postId, req.headers.authorization);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.status !== "OPEN") {
      return res.status(400).json({ message: "Post is not open for claims" });
    }

    if (post.userId === req.user.userId) {
      return res.status(400).json({ message: "You cannot claim your own post" });
    }

    const existing = await prisma.claim.findFirst({
      where: {
        postId,
        claimantUserId: req.user.userId,
        status: "PENDING",
      },
    });

    if (existing) {
      return res.status(409).json({
        message: "You already have a pending claim for this post",
      });
    }

    const claim = await prisma.claim.create({
      data: {
        postId,
        claimantUserId: req.user.userId,
        ownerUserId: post.userId,
        message: typeof message === "string" ? message.trim() : null,
        proof: typeof proof === "string" ? proof.trim() : null,
      },
    });

    await createNotification({
      userId: post.userId,
      title: "New claim received",
      message: "A user submitted a claim for your item.",
      type: "CLAIM_SUBMITTED",
      metadata: { claimId: claim.id, postId },
    });

    return res.status(201).json({ claim });
  } catch (error) {
    next(error);
  }
}

export async function getMyClaims(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const claims = await prisma.claim.findMany({
      where: { claimantUserId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ count: claims.length, claims });
  } catch (error) {
    next(error);
  }
}

export async function getReceivedClaims(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const claims = await prisma.claim.findMany({
      where: { ownerUserId: req.user!.userId },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ count: claims.length, claims });
  } catch (error) {
    next(error);
  }
}

export async function getClaimById(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params.id },
    });

    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    const isOwner = claim.ownerUserId === req.user!.userId;
    const isClaimant = claim.claimantUserId === req.user!.userId;
    const isAdmin = req.user!.role?.toLowerCase() === "admin";

    if (!isOwner && !isClaimant && !isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.json({ claim });
  } catch (error) {
    next(error);
  }
}

export async function approveClaim(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params.id },
    });

    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    const isOwner = claim.ownerUserId === req.user!.userId;
    const isAdmin = req.user!.role?.toLowerCase() === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (claim.status !== "PENDING") {
      return res.status(400).json({ message: "Only pending claims can be approved" });
    }

    const post = await getPostById(claim.postId, req.headers.authorization);

    if (!post) {
      return res.status(404).json({ message: "Related post not found" });
    }

    if (post.status !== "OPEN") {
      return res.status(400).json({ message: "Post is already closed" });
    }

    const approvedClaim = await prisma.claim.update({
      where: { id: claim.id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedByUserId: req.user!.userId,
      },
    });

    await closePost(claim.postId, req.headers.authorization);

    await prisma.claim.updateMany({
      where: {
        postId: claim.postId,
        status: "PENDING",
        id: { not: claim.id },
      },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedByUserId: req.user!.userId,
      },
    });

    await createNotification({
      userId: claim.claimantUserId,
      title: "Claim approved",
      message: "Your claim was approved.",
      type: "CLAIM_APPROVED",
      metadata: { claimId: claim.id, postId: claim.postId },
    });

    return res.json({
      message: "Claim approved successfully",
      claim: approvedClaim,
    });
  } catch (error) {
    next(error);
  }
}

export async function rejectClaim(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params.id },
    });

    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    const isOwner = claim.ownerUserId === req.user!.userId;
    const isAdmin = req.user!.role?.toLowerCase() === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (claim.status !== "PENDING") {
      return res.status(400).json({ message: "Only pending claims can be rejected" });
    }

    const updated = await prisma.claim.update({
      where: { id: claim.id },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedByUserId: req.user!.userId,
      },
    });

    await createNotification({
      userId: claim.claimantUserId,
      title: "Claim rejected",
      message: "Your claim was rejected.",
      type: "CLAIM_REJECTED",
      metadata: { claimId: claim.id, postId: claim.postId },
    });

    return res.json({
      message: "Claim rejected successfully",
      claim: updated,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelClaim(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const claim = await prisma.claim.findUnique({
      where: { id: req.params.id },
    });

    if (!claim) {
      return res.status(404).json({ message: "Claim not found" });
    }

    if (claim.claimantUserId !== req.user!.userId) {
      return res.status(403).json({ message: "Not allowed" });
    }

    if (claim.status !== "PENDING") {
      return res.status(400).json({ message: "Only pending claims can be cancelled" });
    }

    const updated = await prisma.claim.update({
      where: { id: claim.id },
      data: {
        status: "CANCELLED",
      },
    });

    return res.json({
      message: "Claim cancelled successfully",
      claim: updated,
    });
  } catch (error) {
    next(error);
  }
}