import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";

describe("GET /rooms/:roomId", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildApp();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("returns room metadata when room exists", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/rooms",
      payload: {
        roomName: "My Room",
        creatorUserId: "owner-1",
        maxParticipants: 10,
        messageExpiration: "24h",
        allowImages: false,
        roomExpirationValue: 3,
        roomExpirationUnit: "days"
      }
    });
    const { roomId } = createResponse.json<{ roomId: string }>();

    const response = await app.inject({
      method: "GET",
      url: `/rooms/${roomId}`
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      roomId: string;
      roomName: string;
      creatorUserId: string;
      maxParticipants: number;
      messageExpiration: string;
      allowImages: boolean;
      roomExpirationValue: number;
      roomExpirationUnit: string;
      expiresAt: string;
    }>();
    expect(body.roomId).toBe(roomId);
    expect(body.roomName).toBe("My Room");
    expect(body.creatorUserId).toBe("owner-1");
    expect(body.maxParticipants).toBe(10);
    expect(body.messageExpiration).toBe("24h");
    expect(body.allowImages).toBe(false);
    expect(body.roomExpirationValue).toBe(3);
    expect(body.roomExpirationUnit).toBe("days");
    expect(typeof body.expiresAt).toBe("string");
  });

  it("returns 404 when room does not exist", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/rooms/00000000-0000-4000-8000-000000000000"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "Room not found" });
  });
});
