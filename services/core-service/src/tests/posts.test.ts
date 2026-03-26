import request from "supertest";
import jwt from "jsonwebtoken";

jest.mock("../config/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    post: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock("../services/internalServices", () => ({
  findMatchesForPost: jest.fn(),
  notifyPossibleMatch: jest.fn(),
}));

import { createApp } from "../app";
import { env } from "../config/env";
import { prisma } from "../config/db";
import {
  findMatchesForPost,
  notifyPossibleMatch,
} from "../services/internalServices";

const app = createApp();
const prismaMock = prisma as any;
const findMatchesForPostMock = findMatchesForPost as jest.MockedFunction<typeof findMatchesForPost>;
const notifyPossibleMatchMock = notifyPossibleMatch as jest.MockedFunction<typeof notifyPossibleMatch>;

function createToken(userId: string, role = "student") {
  return jwt.sign({ userId, email: `${userId}@example.com`, role }, env.JWT_SECRET);
}

describe("posts routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    findMatchesForPostMock.mockResolvedValue([]);
    notifyPossibleMatchMock.mockResolvedValue(undefined);
  });

  it("create post success with valid token", async () => {
    const token = createToken("owner-1");
    const createdPost = {
      id: "post-1",
      type: "LOST",
      category: "Phone",
      location: "Library",
      date: new Date("2026-03-20T10:00:00.000Z"),
      description: "Black iPhone",
      imageUrl: null,
      status: "OPEN",
      userId: "owner-1",
      user: {
        id: "owner-1",
        fullName: "Owner One",
        email: "owner@example.com",
        role: "student",
      },
    };

    prismaMock.post.create.mockResolvedValue(createdPost as never);
    findMatchesForPostMock.mockResolvedValue([
      {
        postId: "post-1",
        matchedPostId: "post-2",
        matchScore: 88,
        reasons: ["Same category"],
      },
    ]);

    const response = await request(app)
      .post("/posts")
      .set("Authorization", `Bearer ${token}`)
      .send({
        type: "LOST",
        category: "Phone",
        location: "Library",
        date: "2026-03-20T10:00:00.000Z",
        description: "Black iPhone",
      });

    expect(response.status).toBe(201);
    expect(response.body.post.id).toBe("post-1");
    expect(response.body.matches).toHaveLength(1);
    expect(findMatchesForPostMock).toHaveBeenCalled();
    expect(notifyPossibleMatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "owner-1",
        postId: "post-1",
      })
    );
  });

  it("create post fails without token", async () => {
    const response = await request(app).post("/posts").send({
      type: "LOST",
      category: "Phone",
      location: "Library",
      date: "2026-03-20T10:00:00.000Z",
      description: "Black iPhone",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Authorization token required" });
    expect(prismaMock.post.create).not.toHaveBeenCalled();
  });

  it("list posts works", async () => {
    prismaMock.post.findMany.mockResolvedValue([
      {
        id: "post-1",
        category: "Phone",
      },
      {
        id: "post-2",
        category: "Bag",
      },
    ] as never);

    const response = await request(app).get("/posts");

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(2);
    expect(response.body.posts).toHaveLength(2);
    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.any(Object),
        orderBy: { createdAt: "desc" },
      })
    );
  });

  it("get post by id works", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      category: "Phone",
      user: {
        id: "owner-1",
        fullName: "Owner One",
        email: "owner@example.com",
        role: "student",
      },
    } as never);

    const response = await request(app).get("/posts/post-1");

    expect(response.status).toBe(200);
    expect(response.body.post.id).toBe("post-1");
    expect(prismaMock.post.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "post-1" },
      })
    );
  });

  it("close post by owner works", async () => {
    const token = createToken("owner-1");
    prismaMock.post.findUnique.mockResolvedValueOnce({
      id: "post-1",
      userId: "owner-1",
      status: "OPEN",
    } as never);
    prismaMock.post.update.mockResolvedValue({
      id: "post-1",
      userId: "owner-1",
      status: "CLOSED",
      user: {
        id: "owner-1",
        fullName: "Owner One",
        email: "owner@example.com",
        role: "student",
      },
    } as never);

    const response = await request(app)
      .patch("/posts/post-1/close")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Post closed successfully");
    expect(response.body.post.status).toBe("CLOSED");
  });

  it("close post by non-owner fails", async () => {
    const token = createToken("intruder-1");
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      userId: "owner-1",
      status: "OPEN",
    } as never);

    const response = await request(app)
      .patch("/posts/post-1/close")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Not allowed to close this post" });
    expect(prismaMock.post.update).not.toHaveBeenCalled();
  });
});
