import axios from "axios";
import { env } from "../config/env";

function internalHeaders(extra?: Record<string, string>) {
  return {
    ...(env.INTERNAL_SERVICE_KEY
      ? { "x-internal-service-key": env.INTERNAL_SERVICE_KEY }
      : {}),
    ...(extra || {}),
  };
}

export async function getPostById(postId: string, authHeader?: string) {
  const response = await axios.get(`${env.CORE_SERVICE_URL}/posts/${postId}`, {
    headers: {
      ...internalHeaders(),
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    timeout: 5000,
  });

  return response.data?.post || response.data;
}

export async function closePost(postId: string, authHeader?: string) {
  const response = await axios.patch(
    `${env.CORE_SERVICE_URL}/posts/${postId}/close`,
    {},
    {
      headers: {
        ...internalHeaders(),
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      timeout: 5000,
    }
  );

  return response.data;
}

export async function createNotification(data: {
  userId: string;
  title: string;
  message: string;
  type: string;
  metadata?: unknown;
}) {
  try {
    await axios.post(`${env.NOTIFICATIONS_SERVICE_URL}/notify`, data, {
      headers: {
        ...internalHeaders(),
        "Content-Type": "application/json",
      },
      timeout: 5000,
    });
  } catch (error: any) {
    console.warn("[notifications] skipped:", error?.response?.status || error?.message);
  }
}