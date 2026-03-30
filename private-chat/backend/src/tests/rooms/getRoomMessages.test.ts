import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { FastifyInstance } from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../app.js";
import { SqliteMessagesRepository } from "../../repositories/sqliteMessagesRepository.js";

let databaseUrl = "";
let tempDirectory = "";

async function createTempDatabaseUrl(): Promise<string> {
  tempDirectory = join("/tmp", `private-chat-room-messages-${randomUUID()}`);
  await mkdir(tempDirectory, { recursive: true });
  return `file:${join(tempDirectory, "test.db")}`;
}

describe("GET /rooms/:roomId/messages", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    databaseUrl = await createTempDatabaseUrl();
    process.env.DATABASE_URL = databaseUrl;
    app = buildApp();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }

    delete process.env.DATABASE_URL;
    if (tempDirectory) {
      await rm(tempDirectory, { recursive: true, force: true });
    }
  });

  it("returns empty list when room has no messages", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/rooms",
      payload: {
        maxParticipants: 5,
        messageExpiration: "1h",
        allowImages: true,
        roomExpirationValue: 24,
        roomExpirationUnit: "hours"
      }
    });
    const { roomId } = createResponse.json<{ roomId: string }>();

    const response = await app.inject({
      method: "GET",
      url: `/rooms/${roomId}/messages`
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ roomId, messages: [] });
  });

  it("returns room messages for existing room", async () => {
    const createResponse = await app.inject({
      method: "POST",
      url: "/rooms",
      payload: {
        maxParticipants: 10,
        messageExpiration: "24h",
        allowImages: false,
        roomExpirationValue: 2,
        roomExpirationUnit: "days"
      }
    });
    const { roomId } = createResponse.json<{ roomId: string }>();

    const repository = new SqliteMessagesRepository(databaseUrl);
    await repository.create({
      roomId,
      type: "text",
      content: "first message",
      expiresAt: new Date(Date.now() - 1_000).toISOString()
    });
    await repository.create({
      roomId,
      type: "text",
      content: "second message",
      expiresAt: new Date(Date.now() + 60_000).toISOString()
    });

    const response = await app.inject({
      method: "GET",
      url: `/rooms/${roomId}/messages?limit=1`
    });

    expect(response.statusCode).toBe(200);
    const body = response.json<{
      roomId: string;
      messages: Array<{ type: string; content: string }>;
    }>();
    expect(body.roomId).toBe(roomId);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0]?.content).toBe("second message");
  });
});
