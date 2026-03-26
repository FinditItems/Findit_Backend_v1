import axios from "axios";

export type CorePost = {
  id: string;
  type: "LOST" | "FOUND";
  category: string;
  location: string;
  date: string;
  description: string;
  imageUrl?: string | null;
  status?: "OPEN" | "CLOSED";
  userId?: string;
};

const CORE_SERVICE_URL =
  process.env.CORE_SERVICE_URL || "http://core-service:4000";

const INTERNAL_SERVICE_KEY = process.env.INTERNAL_SERVICE_KEY || "";

export async function fetchCandidatePosts(type: "LOST" | "FOUND") {
  const response = await axios.get(`${CORE_SERVICE_URL}/posts`, {
    params: {
      type,
      status: "OPEN",
    },
    headers: {
      "Content-Type": "application/json",
      ...(INTERNAL_SERVICE_KEY
        ? { "x-internal-service-key": INTERNAL_SERVICE_KEY }
        : {}),
    },
    timeout: 5000,
  });

  const posts = Array.isArray(response.data?.posts) ? response.data.posts : [];

  return posts as CorePost[];
}