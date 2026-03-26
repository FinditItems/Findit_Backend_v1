import axios from "axios";
import type { AxiosError } from "axios";
import { env } from "../config/env";

type MatchReason = {
  postId: string;
  matchedPostId: string;
  matchScore: number;
  reasons: string[];
};

type CreatedPostPayload = {
  id: string;
  type: string;
  category: string;
  location: string;
  date: Date;
  description: string;
  imageUrl: string | null;
  status: string;
  userId: string;
};

export async function findMatchesForPost(post: CreatedPostPayload) {
  try {
    const response = await axios.post(
      `${env.MATCHING_SERVICE_URL}/match`,
      post,
      {
        headers: {
          "Content-Type": "application/json",
          ...(env.INTERNAL_SERVICE_KEY
            ? { "x-internal-service-key": env.INTERNAL_SERVICE_KEY }
            : {}),
        },
        timeout: 5000,
      }
    );

    const matches = Array.isArray(response.data?.matches) ? response.data.matches : [];
    return matches as MatchReason[];
  } catch (error) {
    logServiceError("matching-service", error);
    return [];
  }
}

export async function notifyPossibleMatch(params: {
  userId: string;
  postId: string;
  matches: MatchReason[];
}) {
  try {
    await axios.post(
      `${env.NOTIFICATIONS_SERVICE_URL}/notify`,
      {
        userId: params.userId,
        title: "Possible match found",
        message: "We found possible matches for your post.",
        type: "MATCH_FOUND",
        metadata: {
          postId: params.postId,
          matches: params.matches,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          ...(env.INTERNAL_SERVICE_KEY
            ? { "x-internal-service-key": env.INTERNAL_SERVICE_KEY }
            : {}),
        },
        timeout: 5000,
      }
    );
  } catch (error) {
    logServiceError("notifications-service", error);
  }
}

function logServiceError(serviceName: string, error: unknown) {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    const status = axiosError.response?.status;
    const responseData = axiosError.response?.data;

    console.error(
      `[${serviceName}] request failed`,
      JSON.stringify({
        message: axiosError.message,
        status,
        responseData,
      })
    );
    return;
  }

  console.error(`[${serviceName}] request failed`, error);
}
