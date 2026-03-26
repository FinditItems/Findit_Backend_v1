import { Request, Response, NextFunction } from "express";
import { rankMatches, Post } from "../services/matchingEngine";
import { fetchCandidatePosts } from "../services/coreClient";

function isValidPost(post: any): post is Post {
  return (
    post &&
    typeof post.id === "string" &&
    (post.type === "LOST" || post.type === "FOUND") &&
    typeof post.category === "string" &&
    typeof post.location === "string" &&
    typeof post.date === "string" &&
    typeof post.description === "string"
  );
}

export async function matchPost(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { post } = req.body;

    if (!isValidPost(post)) {
      return res.status(400).json({ message: "Invalid post payload" });
    }

    const oppositeType = post.type === "LOST" ? "FOUND" : "LOST";

    const candidates = await fetchCandidatePosts(oppositeType);

    const filteredCandidates = candidates.filter(
      (candidate) => candidate.id !== post.id && candidate.status === "OPEN"
    );

    const matches = rankMatches(post, filteredCandidates);

    return res.status(200).json({
      count: matches.length,
      matches,
    });
  } catch (error: any) {
    console.error("Matching error:", error?.response?.data || error?.message || error);
    next(error);
  }
}