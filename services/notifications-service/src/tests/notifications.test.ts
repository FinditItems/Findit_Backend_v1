import request from "supertest";
import jwt from "jsonwebtoken";

jest.mock("../config/db", () => ({
  prisma: {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

import { createApp } from "../app";
import { env } from "../config/env";
import { prisma } from "../config/db";

const app = createApp();
const prismaMock = prisma as any;

function createToken(userId: string) {
  return jwt.sign({ userId, email: `${userId}@example.com`, role: "student" }, env.JWT_SECRET);
}

describe("notifications routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("create notification success", async () => {
    prismaMock.notification.create.mockResolvedValue({
      id: "notification-1",
      userId: "user-1",
      type: "SYSTEM",
      title: "Notice",
      message: "Test notification",
      read: false,
    } as never);

    const response = await request(app)
      .post("/notify")
      .set("Authorization", `Bearer ${createToken("admin-1")}`)
      .send({
        userId: "user-1",
        type: "SYSTEM",
        title: "Notice",
        message: "Test notification",
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe("notification-1");
  });

  it("create notification fails with invalid type", async () => {
    const response = await request(app)
      .post("/notify")
      .set("Authorization", `Bearer ${createToken("admin-1")}`)
      .send({
        userId: "user-1",
        type: "CLAIM_SUBMITTED",
        title: "Notice",
        message: "Test notification",
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "userId, type, title, message are required",
    });
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });

  it("get my notifications works", async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      { id: "notification-1", read: false },
      { id: "notification-2", read: true },
    ] as never);

    const response = await request(app)
      .get("/notifications/me")
      .set("Authorization", `Bearer ${createToken("user-1")}`);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(2);
    expect(response.body.items).toHaveLength(2);
  });

  it("unreadOnly filter works", async () => {
    prismaMock.notification.findMany.mockResolvedValue([
      { id: "notification-1", read: false },
    ] as never);

    const response = await request(app)
      .get("/notifications/me?unreadOnly=true")
      .set("Authorization", `Bearer ${createToken("user-1")}`);

    expect(response.status).toBe(200);
    expect(prismaMock.notification.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        read: false,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });

  it("mark one as read works", async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 1 } as never);

    const response = await request(app)
      .patch("/notifications/notification-1/read")
      .set("Authorization", `Bearer ${createToken("user-1")}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Notification marked as read",
      updated: 1,
    });
  });

  it("mark all as read works", async () => {
    prismaMock.notification.updateMany.mockResolvedValue({ count: 3 } as never);

    const response = await request(app)
      .patch("/notifications/read-all")
      .set("Authorization", `Bearer ${createToken("user-1")}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      message: "Notifications marked as read",
      updated: 3,
    });
  });
});
