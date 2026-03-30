import { randomUUID } from "node:crypto";
import { open, type Database } from "sqlite";
import sqlite3 from "sqlite3";
import type { CreateRoomData, Room, RoomsRepository } from "./roomsRepository.js";

function resolveSqliteFilename(databaseUrl: string): string {
  if (databaseUrl === ":memory:") {
    return databaseUrl;
  }

  if (!databaseUrl.startsWith("file:")) {
    throw new Error("DATABASE_URL must use file: prefix for sqlite");
  }

  return databaseUrl.slice(5);
}

export class SqliteRoomsRepository implements RoomsRepository {
  private readonly dbPromise: Promise<Database>;

  constructor(databaseUrl: string) {
    this.dbPromise = this.initialize(databaseUrl);
  }

  async create(data: CreateRoomData): Promise<Room> {
    const db = await this.dbPromise;
    const roomId = randomUUID();
    const createdAt = new Date().toISOString();

    await db.run(
      `
        INSERT INTO rooms (id, max_participants, message_expiration, allow_images, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
      roomId,
      data.maxParticipants,
      data.messageExpiration,
      data.allowImages ? 1 : 0,
      createdAt
    );

    return {
      id: roomId,
      maxParticipants: data.maxParticipants,
      messageExpiration: data.messageExpiration,
      allowImages: data.allowImages,
      createdAt
    };
  }

  async findById(id: string): Promise<Room | null> {
    const db = await this.dbPromise;
    const row = await db.get<{
      id: string;
      max_participants: number;
      message_expiration: Room["messageExpiration"];
      allow_images: number;
      created_at: string;
    }>(
      `
        SELECT id, max_participants, message_expiration, allow_images, created_at
        FROM rooms
        WHERE id = ?
      `,
      id
    );

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      maxParticipants: row.max_participants,
      messageExpiration: row.message_expiration,
      allowImages: row.allow_images === 1,
      createdAt: row.created_at
    };
  }

  async close(): Promise<void> {
    const db = await this.dbPromise;
    await db.close();
  }

  private async initialize(databaseUrl: string): Promise<Database> {
    const filename = resolveSqliteFilename(databaseUrl);
    const db = await open({
      filename,
      driver: sqlite3.Database
    });

    await this.ensureSchema(db);
    return db;
  }

  private async ensureSchema(db: Database): Promise<void> {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        max_participants INTEGER NOT NULL,
        message_expiration TEXT NOT NULL,
        allow_images INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    const columns = (await db.all("PRAGMA table_info(rooms)")) as Array<{
      name: string;
      type: string;
    }>;
    const idColumn = columns.find((column) => column.name === "id");
    const idType = (idColumn?.type ?? "").toUpperCase();

    if (idType === "TEXT") {
      return;
    }

    await db.exec(`
      BEGIN TRANSACTION;

      CREATE TABLE rooms_new (
        id TEXT PRIMARY KEY,
        max_participants INTEGER NOT NULL,
        message_expiration TEXT NOT NULL,
        allow_images INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      INSERT INTO rooms_new (id, max_participants, message_expiration, allow_images, created_at)
      SELECT CAST(id AS TEXT), max_participants, message_expiration, allow_images, created_at
      FROM rooms;

      DROP TABLE rooms;
      ALTER TABLE rooms_new RENAME TO rooms;

      COMMIT;
    `);
  }
}
