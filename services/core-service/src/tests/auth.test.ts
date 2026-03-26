import request from "supertest";
import bcrypt from "bcrypt";

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
import { prisma } from "../config/db";

const app = createApp();
const prismaMock = prisma as any;

describe("auth routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("register success", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: "user-1",
      fullName: "Jane Doe",
      email: "jane@example.com",
      role: "student",
    } as never);

    const response = await request(app).post("/auth/register").send({
      fullName: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
    });

    expect(response.status).toBe(201);
    expect(response.body.user).toMatchObject({
      id: "user-1",
      fullName: "Jane Doe",
      email: "jane@example.com",
      role: "student",
    });
    expect(response.body.token).toEqual(expect.any(String));
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fullName: "Jane Doe",
          email: "jane@example.com",
          role: "student",
        }),
      })
    );
  });

  it("register duplicate email fails", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      email: "jane@example.com",
    } as never);

    const response = await request(app).post("/auth/register").send({
      fullName: "Jane Doe",
      email: "jane@example.com",
      password: "password123",
    });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ message: "Email already in use" });
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("login success", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      fullName: "Jane Doe",
      email: "jane@example.com",
      role: "student",
      passwordHash,
    } as never);

    const response = await request(app).post("/auth/login").send({
      email: "jane@example.com",
      password: "password123",
    });

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      id: "user-1",
      fullName: "Jane Doe",
      email: "jane@example.com",
      role: "student",
    });
    expect(response.body.token).toEqual(expect.any(String));
  });

  it("login wrong password fails", async () => {
    const passwordHash = await bcrypt.hash("password123", 10);
    prismaMock.user.findUnique.mockResolvedValue({
      id: "user-1",
      fullName: "Jane Doe",
      email: "jane@example.com",
      role: "student",
      passwordHash,
    } as never);

    const response = await request(app).post("/auth/login").send({
      email: "jane@example.com",
      password: "wrong-password",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Invalid credentials" });
  });
});
