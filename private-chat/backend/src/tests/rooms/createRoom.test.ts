import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../../app.js";

describe("POST /rooms", () => {
  const uuidV4Pattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  let app: FastifyInstance;

  beforeEach(() => {
    app = buildApp();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it("creates a room with valid settings", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/rooms",
      payload: {
        maxParticipants: 5,
        messageExpiration: "1h",
        allowImages: true
      }
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.roomId).toBeTypeOf("string");
    expect(body.roomId).toMatch(uuidV4Pattern);
    expect(body.link).toBe(`/room/${body.roomId}`);
  });

  it("rejects invalid participant limit", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/rooms",
      payload: {
        maxParticipants: 4,
        messageExpiration: "1h",
        allowImages: true
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "maxParticipants is invalid" });
  });

  it("rejects invalid message expiration", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/rooms",
      payload: {
        maxParticipants: 5,
        messageExpiration: "7d",
        allowImages: true
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "messageExpiration is invalid" });
  });

  it("rejects invalid payload shape", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/rooms",
      payload: {
        maxParticipants: 5,
        messageExpiration: "1h"
      }
    });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({ error: "Invalid room payload" });
  });
});
