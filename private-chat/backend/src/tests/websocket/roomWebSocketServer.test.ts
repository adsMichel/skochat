import { describe, expect, it } from "vitest";
import {
  buildHistoryPayload,
  calculateMessageExpiresAt,
  canConnectToRoom
} from "../../websocket/roomWebSocketServer.js";
import type { RoomsRepository } from "../../repositories/roomsRepository.js";

describe("canConnectToRoom", () => {
  it("returns true when room exists", async () => {
    const repository: RoomsRepository = {
      create: async () => {
        throw new Error("not used");
      },
      updateRoomName: async () => {
        throw new Error("not used");
      },
      findById: async () => ({
        id: "room-1",
        roomName: "Room 1",
        creatorUserId: "owner-1",
        maxParticipants: 5,
        messageExpiration: "1h",
        allowImages: true,
        roomExpirationValue: 24,
        roomExpirationUnit: "hours",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      })
    };

    await expect(canConnectToRoom("room-1", repository, 0)).resolves.toEqual({
      allowed: true,
      room: expect.objectContaining({ id: "room-1" })
    });
  });

  it("returns room not found when room does not exist", async () => {
    const repository: RoomsRepository = {
      create: async () => {
        throw new Error("not used");
      },
      updateRoomName: async () => {
        throw new Error("not used");
      },
      findById: async () => null
    };

    await expect(canConnectToRoom("room-missing", repository, 0)).resolves.toEqual({
      allowed: false,
      reason: "ROOM_NOT_FOUND"
    });
  });

  it("returns room full when room is at capacity", async () => {
    const repository: RoomsRepository = {
      create: async () => {
        throw new Error("not used");
      },
      updateRoomName: async () => {
        throw new Error("not used");
      },
      findById: async () => ({
        id: "room-2",
        roomName: "Room 2",
        creatorUserId: "owner-2",
        maxParticipants: 2,
        messageExpiration: "1h",
        allowImages: true,
        roomExpirationValue: 24,
        roomExpirationUnit: "hours",
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString()
      })
    };

    await expect(canConnectToRoom("room-2", repository, 2)).resolves.toEqual({
      allowed: false,
      reason: "ROOM_FULL"
    });
  });

  it("returns room expired when room expiration is in the past", async () => {
    const repository: RoomsRepository = {
      create: async () => {
        throw new Error("not used");
      },
      updateRoomName: async () => {
        throw new Error("not used");
      },
      findById: async () => ({
        id: "room-3",
        roomName: "Room 3",
        creatorUserId: "owner-3",
        maxParticipants: 2,
        messageExpiration: "1h",
        allowImages: true,
        roomExpirationValue: 1,
        roomExpirationUnit: "hours",
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        createdAt: new Date().toISOString()
      })
    };

    await expect(canConnectToRoom("room-3", repository, 0)).resolves.toEqual({
      allowed: false,
      reason: "ROOM_EXPIRED"
    });
  });
});

describe("calculateMessageExpiresAt", () => {
  it("returns null for never expiration", () => {
    expect(calculateMessageExpiresAt("never", new Date("2026-01-01T00:00:00.000Z"))).toBeNull();
  });

  it("calculates expiration timestamp for 1h", () => {
    expect(calculateMessageExpiresAt("1h", new Date("2026-01-01T00:00:00.000Z"))).toBe(
      "2026-01-01T01:00:00.000Z"
    );
  });
});

describe("buildHistoryPayload", () => {
  it("builds websocket history payload with messages", () => {
    const payload = buildHistoryPayload(
      "room-1",
      [
        {
          id: "msg-1",
          roomId: "room-1",
          userId: "u1",
          type: "text",
          content: "hello",
          expiresAt: null,
          createdAt: "2026-01-01T00:00:00.000Z"
        },
        {
          id: "msg-2",
          roomId: "room-1",
          userId: null,
          type: "system",
          content: "welcome",
          expiresAt: null,
          createdAt: "2026-01-01T00:00:01.000Z"
        }
      ],
      [
        {
          id: "u1",
          name: "Michel",
          avatar: "🧙",
          mood: "Friendly 😊",
          xp: 10,
          level: 1,
          achievements: [],
          online: true
        }
      ]
    );

    expect(JSON.parse(payload)).toEqual({
      type: "history",
      roomId: "room-1",
      messages: [
        {
          messageId: "msg-1",
          userId: "u1",
          userName: "Michel",
          avatar: "🧙",
          mood: "Friendly 😊",
          messageType: "text",
          content: "hello",
          createdAt: "2026-01-01T00:00:00.000Z"
        },
        {
          messageId: "msg-2",
          userId: null,
          userName: "System",
          avatar: "🏆",
          mood: "System",
          messageType: "system",
          content: "welcome",
          createdAt: "2026-01-01T00:00:01.000Z"
        }
      ]
    });
  });
});
