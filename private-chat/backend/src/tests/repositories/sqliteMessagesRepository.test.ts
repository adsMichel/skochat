import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SqliteMessagesRepository } from "../../repositories/sqliteMessagesRepository.js";

const tempDirectories: string[] = [];

async function createTempDatabaseUrl(): Promise<string> {
  const directory = join("/tmp", `private-chat-messages-test-${randomUUID()}`);
  await mkdir(directory, { recursive: true });
  tempDirectories.push(directory);
  return `file:${join(directory, "test.db")}`;
}

describe("SqliteMessagesRepository", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirectories.splice(0, tempDirectories.length).map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );
  });

  it("persists and lists room messages", async () => {
    const databaseUrl = await createTempDatabaseUrl();
    const repository = new SqliteMessagesRepository(databaseUrl);

    const message = await repository.create({
      roomId: "room-1",
      type: "text",
      content: "hello",
      expiresAt: null
    });
    const messages = await repository.listByRoom("room-1", 20);

    expect(message.roomId).toBe("room-1");
    expect(message.type).toBe("text");
    expect(message.content).toBe("hello");
    expect(message.expiresAt).toBeNull();
    expect(messages).toHaveLength(1);
    expect(messages[0]?.id).toBe(message.id);
  });

  it("does not list expired messages and deletes them with cleanup", async () => {
    const databaseUrl = await createTempDatabaseUrl();
    const repository = new SqliteMessagesRepository(databaseUrl);
    const pastIso = new Date(Date.now() - 60_000).toISOString();
    const futureIso = new Date(Date.now() + 60_000).toISOString();

    await repository.create({
      roomId: "room-2",
      type: "text",
      content: "expired message",
      expiresAt: pastIso
    });
    await repository.create({
      roomId: "room-2",
      type: "text",
      content: "active message",
      expiresAt: futureIso
    });

    const listed = await repository.listByRoom("room-2", 10);
    expect(listed).toHaveLength(1);
    expect(listed[0]?.content).toBe("active message");

    const deleted = await repository.deleteExpired(new Date().toISOString());
    expect(deleted).toBe(1);
  });
});
