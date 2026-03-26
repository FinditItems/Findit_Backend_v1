export type PostType = "LOST" | "FOUND";

export type Post = {
  id: string;
  type: PostType;
  category: string;
  location: string;
  date: string;
  description: string;
  imageUrl?: string | null;
  status?: string;
  userId?: string;
};

export type MatchResult = {
  postId: string;
  matchedPostId: string;
  matchScore: number;
  reasons: string[];
};

function normalize(text: string) {
  return (text || "").trim().toLowerCase();
}

function tokenize(text: string) {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function keywordOverlap(a: string, b: string) {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));
  let count = 0;

  for (const word of setA) {
    if (setB.has(word)) count++;
  }

  return count;
}

function daysBetween(a: string, b: string) {
  const d1 = new Date(a).getTime();
  const d2 = new Date(b).getTime();
  return Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
}

export function scoreMatch(post: Post, candidate: Post): MatchResult {
  let score = 0;
  const reasons: string[] = [];

  if (normalize(post.category) === normalize(candidate.category)) {
    score += 40;
    reasons.push("Same category");
  }

  if (
    normalize(post.location).includes(normalize(candidate.location)) ||
    normalize(candidate.location).includes(normalize(post.location))
  ) {
    score += 25;
    reasons.push("Similar location");
  }

  const gap = daysBetween(post.date, candidate.date);
  if (gap <= 1) {
    score += 20;
    reasons.push("Date is very close");
  } else if (gap <= 3) {
    score += 10;
    reasons.push("Date is close");
  }

  const overlap = keywordOverlap(post.description, candidate.description);
  if (overlap >= 3) {
    score += 15;
    reasons.push("Strong keyword overlap");
  } else if (overlap >= 1) {
    score += 8;
    reasons.push("Some keyword overlap");
  }

  return {
    postId: post.id,
    matchedPostId: candidate.id,
    matchScore: score,
    reasons,
  };
}

export function rankMatches(post: Post, candidates: Post[]) {
  return candidates
    .filter((candidate) => candidate.id !== post.id)
    .filter(
      (candidate) =>
        post.category.trim().toLowerCase() ===
        candidate.category.trim().toLowerCase()
    )
    .map((candidate) => scoreMatch(post, candidate))
    .filter((m) => m.matchScore >= 30)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);
}