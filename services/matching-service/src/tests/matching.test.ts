import request from "supertest";

jest.mock("../services/coreClient", () => ({
  fetchCandidatePosts: jest.fn(),
}));

import { createApp } from "../app";
import { fetchCandidatePosts } from "../services/coreClient";

const app = createApp();
const fetchCandidatePostsMock = fetchCandidatePosts as jest.MockedFunction<
  typeof fetchCandidatePosts
>;

describe("matching routes", () => {
  const basePost = {
    id: "lost-1",
    type: "LOST" as const,
    category: "Laptop",
    location: "Main Library",
    date: "2026-03-20T10:00:00.000Z",
    description: "Silver Dell laptop with stickers",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("/match returns matches for valid input", async () => {
    fetchCandidatePostsMock.mockResolvedValue([
      {
        id: "found-1",
        type: "FOUND",
        category: "Laptop",
        location: "Main Library",
        date: "2026-03-20T12:00:00.000Z",
        description: "Found silver Dell laptop with stickers",
        status: "OPEN",
      },
    ]);

    const response = await request(app).post("/match").send({ post: basePost });

    expect(response.status).toBe(200);
    expect(response.body.count).toBe(1);
    expect(response.body.matches[0]).toMatchObject({
      postId: "lost-1",
      matchedPostId: "found-1",
    });
  });

  it("invalid payload returns 400", async () => {
    const response = await request(app).post("/match").send({
      post: {
        id: "bad-1",
        type: "BROKEN",
      },
    });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ message: "Invalid post payload" });
    expect(fetchCandidatePostsMock).not.toHaveBeenCalled();
  });

  it("excludes same post id", async () => {
    fetchCandidatePostsMock.mockResolvedValue([
      {
        id: "lost-1",
        type: "FOUND",
        category: "Laptop",
        location: "Main Library",
        date: "2026-03-20T11:00:00.000Z",
        description: "Found silver Dell laptop with stickers",
        status: "OPEN",
      },
      {
        id: "found-2",
        type: "FOUND",
        category: "Laptop",
        location: "Main Library",
        date: "2026-03-20T12:00:00.000Z",
        description: "Laptop found near library entrance",
        status: "OPEN",
      },
    ]);

    const response = await request(app).post("/match").send({ post: basePost });

    expect(response.status).toBe(200);
    expect(response.body.matches).toHaveLength(1);
    expect(response.body.matches[0].matchedPostId).toBe("found-2");
  });

  it("excludes closed posts", async () => {
    fetchCandidatePostsMock.mockResolvedValue([
      {
        id: "found-1",
        type: "FOUND",
        category: "Laptop",
        location: "Main Library",
        date: "2026-03-20T12:00:00.000Z",
        description: "Found silver Dell laptop with stickers",
        status: "CLOSED",
      },
      {
        id: "found-2",
        type: "FOUND",
        category: "Laptop",
        location: "Main Library",
        date: "2026-03-20T13:00:00.000Z",
        description: "Found laptop with charger",
        status: "OPEN",
      },
    ]);

    const response = await request(app).post("/match").send({ post: basePost });

    expect(response.status).toBe(200);
    expect(response.body.matches).toHaveLength(1);
    expect(response.body.matches[0].matchedPostId).toBe("found-2");
  });

  it("results sorted by score descending", async () => {
    fetchCandidatePostsMock.mockResolvedValue([
      {
        id: "found-low",
        type: "FOUND",
        category: "Laptop",
        location: "Campus",
        date: "2026-03-24T10:00:00.000Z",
        description: "Laptop found",
        status: "OPEN",
      },
      {
        id: "found-high",
        type: "FOUND",
        category: "Laptop",
        location: "Main Library",
        date: "2026-03-20T11:00:00.000Z",
        description: "Found silver Dell laptop with stickers and charger",
        status: "OPEN",
      },
      {
        id: "found-mid",
        type: "FOUND",
        category: "Laptop",
        location: "Main Library entrance",
        date: "2026-03-22T10:00:00.000Z",
        description: "Found Dell laptop",
        status: "OPEN",
      },
    ]);

    const response = await request(app).post("/match").send({ post: basePost });

    expect(response.status).toBe(200);
    expect(response.body.matches.map((match: { matchedPostId: string }) => match.matchedPostId)).toEqual([
      "found-high",
      "found-mid",
      "found-low",
    ]);
    expect(response.body.matches[0].matchScore).toBeGreaterThan(
      response.body.matches[1].matchScore
    );
  });
});
