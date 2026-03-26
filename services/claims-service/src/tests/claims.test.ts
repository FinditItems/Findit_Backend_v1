import request from "supertest";
import jwt from "jsonwebtoken";

jest.mock("../config/db", () => ({
  prisma: {
    claim: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock("../services/internalServices", () => ({
  getPostById: jest.fn(),
  closePost: jest.fn(),
  createNotification: jest.fn(),
}));

import app from "../app";
import { prisma } from "../config/db";
import {
  closePost,
  createNotification,
  getPostById,
} from "../services/internalServices";

const prismaMock = prisma as any;
const getPostByIdMock = getPostById as jest.MockedFunction<typeof getPostById>;
const closePostMock = closePost as jest.MockedFunction<typeof closePost>;
const createNotificationMock = createNotification as jest.MockedFunction<typeof createNotification>;

function createToken(userId: string, role = "student") {
  return jwt.sign(
    {
      userId,
      email: `${userId}@example.com`,
      role,
    },
    process.env.JWT_SECRET as string
  );
}

describe("claims routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("submit claim success", async () => {
    prismaMock.claim.findFirst.mockResolvedValue(null);
    prismaMock.claim.create.mockResolvedValue({
      id: "claim-1",
      postId: "post-1",
      claimantUserId: "claimant-1",
      ownerUserId: "owner-1",
      status: "PENDING",
    } as never);
    getPostByIdMock.mockResolvedValue({
      id: "post-1",
      userId: "owner-1",
      status: "OPEN",
    } as never);
    createNotificationMock.mockResolvedValue(undefined);

    const response = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${createToken("claimant-1")}`)
      .send({
        postId: "post-1",
        message: "This item is mine",
        proof: "Receipt",
      });

    expect(response.status).toBe(201);
    expect(response.body.claim.id).toBe("claim-1");
    expect(createNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "owner-1",
        type: "CLAIM_REQUESTED",
      })
    );
  });

  it("submit claim fails without token", async () => {
    const response = await request(app).post("/claims").send({
      postId: "post-1",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Authentication required" });
    expect(getPostByIdMock).not.toHaveBeenCalled();
  });

  it("submit claim fails if post not found", async () => {
    getPostByIdMock.mockResolvedValue(null);

    const response = await request(app)
      .post("/claims")
      .set("Authorization", `Bearer ${createToken("claimant-1")}`)
      .send({
        postId: "post-404",
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: "Post not found" });
    expect(prismaMock.claim.create).not.toHaveBeenCalled();
  });

  it("approve claim success by owner", async () => {
    prismaMock.claim.findUnique.mockResolvedValue({
      id: "claim-1",
      postId: "post-1",
      claimantUserId: "claimant-1",
      ownerUserId: "owner-1",
      status: "PENDING",
    } as never);
    getPostByIdMock.mockResolvedValue({
      id: "post-1",
      userId: "owner-1",
      status: "OPEN",
    } as never);
    prismaMock.claim.update.mockResolvedValue({
      id: "claim-1",
      status: "APPROVED",
    } as never);
    prismaMock.claim.updateMany.mockResolvedValue({ count: 2 } as never);
    closePostMock.mockResolvedValue({ message: "Post closed successfully" } as never);
    createNotificationMock.mockResolvedValue(undefined);

    const response = await request(app)
      .patch("/claims/claim-1/approve")
      .set("Authorization", `Bearer ${createToken("owner-1")}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Claim approved successfully");
    expect(closePostMock).toHaveBeenCalledWith("post-1", expect.any(String));
    expect(prismaMock.claim.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          postId: "post-1",
          status: "PENDING",
        }),
      })
    );
  });

  it("approve claim fails for non-owner", async () => {
    prismaMock.claim.findUnique.mockResolvedValue({
      id: "claim-1",
      postId: "post-1",
      claimantUserId: "claimant-1",
      ownerUserId: "owner-1",
      status: "PENDING",
    } as never);

    const response = await request(app)
      .patch("/claims/claim-1/approve")
      .set("Authorization", `Bearer ${createToken("other-user")}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ message: "Not allowed" });
    expect(closePostMock).not.toHaveBeenCalled();
  });

  it("reject claim success", async () => {
    prismaMock.claim.findUnique.mockResolvedValue({
      id: "claim-1",
      postId: "post-1",
      claimantUserId: "claimant-1",
      ownerUserId: "owner-1",
      status: "PENDING",
    } as never);
    prismaMock.claim.update.mockResolvedValue({
      id: "claim-1",
      status: "REJECTED",
    } as never);
    createNotificationMock.mockResolvedValue(undefined);

    const response = await request(app)
      .patch("/claims/claim-1/reject")
      .set("Authorization", `Bearer ${createToken("owner-1")}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Claim rejected successfully");
    expect(response.body.claim.status).toBe("REJECTED");
  });

  it("get my claims works", async () => {
    prismaMock.claim.findMany.mockResolvedValue([
      { id: "claim-1" },
      { id: "claim-2" },
    ] as never);

    const response = await request(app)
      .get("/claims/mine")
      .set("Authorization", `Bearer ${createToken("claimant-1")}`);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(2);
    expect(prismaMock.claim.findMany).toHaveBeenCalledWith({
      where: { claimantUserId: "claimant-1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("get received claims works", async () => {
    prismaMock.claim.findMany.mockResolvedValue([{ id: "claim-3" }] as never);

    const response = await request(app)
      .get("/claims/received")
      .set("Authorization", `Bearer ${createToken("owner-1")}`);

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(prismaMock.claim.findMany).toHaveBeenCalledWith({
      where: { ownerUserId: "owner-1" },
      orderBy: { createdAt: "desc" },
    });
  });
});
