import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";

describe("PATCH /rooms/:roomId/name", () => {
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildApp();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("allows room creator to rename room", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/rooms",
      payload: {
        roomName: "Old Room Name",
        creatorUserId: "creator-1",
        maxParticipants: 5,
        messageExpiration: "1h",
        allowImages: true,
        roomExpirationValue: 2,
        roomExpirationUnit: "hours"
      }
    });
    const { roomId } = createResponse.json<{ roomId: string }>();

    const renameResponse = await app.inject({
      method: "PATCH",
      url: `/rooms/${roomId}/name`,
      payload: {
        requesterUserId: "creator-1",
        roomName: "New Room Name"
      }
    });

    expect(renameResponse.statusCode).toBe(200);
    expect(renameResponse.json()).toEqual({
      roomId,
      roomName: "New Room Name"
    });
  });

  it("returns 403 when requester is not the creator", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/rooms",
      payload: {
        roomName: "Old Room Name",
        creatorUserId: "creator-1",
        maxParticipants: 5,
        messageExpiration: "1h",
        allowImages: true,
        roomExpirationValue: 2,
        roomExpirationUnit: "hours"
      }
    });
    const { roomId } = createResponse.json<{ roomId: string }>();

    const renameResponse = await app.inject({
      method: "PATCH",
      url: `/rooms/${roomId}/name`,
      payload: {
        requesterUserId: "another-user",
        roomName: "New Room Name"
      }
    });

    expect(renameResponse.statusCode).toBe(403);
    expect(renameResponse.json()).toEqual({
      error: "Only room creator can rename the room"
    });
  });
});
