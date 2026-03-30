import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { SqliteRoomsRepository } from "../../repositories/sqliteRoomsRepository.js";

const tempDirectories: string[] = [];
const uuidV4Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function createTempDatabaseUrl(): Promise<string> {
  const directory = join("/tmp", `private-chat-test-${randomUUID()}`);
  await mkdir(directory, { recursive: true });
  tempDirectories.push(directory);
  return `file:${join(directory, "test.db")}`;
}

describe("SqliteRoomsRepository", () => {
  afterEach(async () => {
    await Promise.all(
      tempDirectories.splice(0, tempDirectories.length).map((directory) =>
        rm(directory, { recursive: true, force: true })
      )
    );
  });

  it("persists and reads rooms using the same sqlite file", async () => {
    const databaseUrl = await createTempDatabaseUrl();
    const firstRepository = new SqliteRoomsRepository(databaseUrl);

    const room = await firstRepository.create({
      maxParticipants: 10,
      messageExpiration: "24h",
      allowImages: false
    });
    expect(room.id).toMatch(uuidV4Pattern);

    const secondRepository = new SqliteRoomsRepository(databaseUrl);
    const foundRoom = await secondRepository.findById(room.id);

    expect(foundRoom).not.toBeNull();
    expect(foundRoom?.id).toBe(room.id);
    expect(foundRoom?.maxParticipants).toBe(10);
    expect(foundRoom?.messageExpiration).toBe("24h");
    expect(foundRoom?.allowImages).toBe(false);
  });
});
