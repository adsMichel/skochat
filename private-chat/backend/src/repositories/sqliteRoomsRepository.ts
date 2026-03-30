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
        INSERT INTO rooms (
          id,
          room_name,
          creator_user_id,
          max_participants,
          message_expiration,
          allow_images,
          room_expiration_value,
          room_expiration_unit,
          expires_at,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      roomId,
      data.roomName,
      data.creatorUserId,
      data.maxParticipants,
      data.messageExpiration,
      data.allowImages ? 1 : 0,
      data.roomExpirationValue,
      data.roomExpirationUnit,
      data.expiresAt,
      createdAt
    );

    return {
      id: roomId,
      roomName: data.roomName,
      creatorUserId: data.creatorUserId,
      maxParticipants: data.maxParticipants,
      messageExpiration: data.messageExpiration,
      allowImages: data.allowImages,
      roomExpirationValue: data.roomExpirationValue,
      roomExpirationUnit: data.roomExpirationUnit,
      expiresAt: data.expiresAt,
      createdAt
    };
  }

  async findById(id: string): Promise<Room | null> {
    const db = await this.dbPromise;
    const row = await db.get<{
      id: string;
      room_name: string;
      creator_user_id: string;
      max_participants: number;
      message_expiration: Room["messageExpiration"];
      allow_images: number;
      room_expiration_value: number;
      room_expiration_unit: Room["roomExpirationUnit"];
      expires_at: string;
      created_at: string;
    }>(
      `
        SELECT
          id,
          room_name,
          creator_user_id,
          max_participants,
          message_expiration,
          allow_images,
          room_expiration_value,
          room_expiration_unit,
          expires_at,
          created_at
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
      roomName: row.room_name,
      creatorUserId: row.creator_user_id,
      maxParticipants: row.max_participants,
      messageExpiration: row.message_expiration,
      allowImages: row.allow_images === 1,
      roomExpirationValue: row.room_expiration_value,
      roomExpirationUnit: row.room_expiration_unit,
      expiresAt: row.expires_at,
      createdAt: row.created_at
    };
  }

  async updateRoomName(id: string, roomName: string): Promise<Room | null> {
    const db = await this.dbPromise;
    const result = await db.run(
      `
        UPDATE rooms
        SET room_name = ?
        WHERE id = ?
      `,
      roomName,
      id
    );

    if (result.changes === 0) {
      return null;
    }

    return this.findById(id);
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
        room_name TEXT NOT NULL DEFAULT 'Private Room RPG',
        creator_user_id TEXT NOT NULL DEFAULT '',
        max_participants INTEGER NOT NULL,
        message_expiration TEXT NOT NULL,
        allow_images INTEGER NOT NULL,
        room_expiration_value INTEGER NOT NULL DEFAULT 24,
        room_expiration_unit TEXT NOT NULL DEFAULT 'hours',
        expires_at TEXT NOT NULL DEFAULT '',
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
      await this.ensureNewColumns(db);
      return;
    }

    await db.exec(`
      BEGIN TRANSACTION;

      CREATE TABLE rooms_new (
        id TEXT PRIMARY KEY,
        room_name TEXT NOT NULL DEFAULT 'Private Room RPG',
        creator_user_id TEXT NOT NULL DEFAULT '',
        max_participants INTEGER NOT NULL,
        message_expiration TEXT NOT NULL,
        allow_images INTEGER NOT NULL,
        room_expiration_value INTEGER NOT NULL DEFAULT 24,
        room_expiration_unit TEXT NOT NULL DEFAULT 'hours',
        expires_at TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );

      INSERT INTO rooms_new (
        id,
        room_name,
        creator_user_id,
        max_participants,
        message_expiration,
        allow_images,
        room_expiration_value,
        room_expiration_unit,
        expires_at,
        created_at
      )
      SELECT
        CAST(id AS TEXT),
        'Private Room RPG',
        '',
        max_participants,
        message_expiration,
        allow_images,
        24,
        'hours',
        created_at,
        created_at
      FROM rooms;

      DROP TABLE rooms;
      ALTER TABLE rooms_new RENAME TO rooms;

      COMMIT;
    `);

    await this.ensureNewColumns(db);
  }

  private async ensureNewColumns(db: Database): Promise<void> {
    const columns = (await db.all("PRAGMA table_info(rooms)")) as Array<{ name: string }>;
    const columnNames = new Set(columns.map((column) => column.name));

    if (!columnNames.has("room_expiration_value")) {
      await db.exec("ALTER TABLE rooms ADD COLUMN room_expiration_value INTEGER NOT NULL DEFAULT 24;");
    }

    if (!columnNames.has("room_name")) {
      await db.exec(
        "ALTER TABLE rooms ADD COLUMN room_name TEXT NOT NULL DEFAULT 'Private Room RPG';"
      );
    }

    if (!columnNames.has("creator_user_id")) {
      await db.exec("ALTER TABLE rooms ADD COLUMN creator_user_id TEXT NOT NULL DEFAULT '';");
    }

    if (!columnNames.has("room_expiration_unit")) {
      await db.exec(
        "ALTER TABLE rooms ADD COLUMN room_expiration_unit TEXT NOT NULL DEFAULT 'hours';"
      );
    }

    if (!columnNames.has("expires_at")) {
      await db.exec("ALTER TABLE rooms ADD COLUMN expires_at TEXT NOT NULL DEFAULT '';");
    }

    await db.exec(`
      UPDATE rooms
      SET room_name = 'Private Room RPG'
      WHERE room_name IS NULL OR TRIM(room_name) = '';
    `);
    await db.exec(`
      UPDATE rooms
      SET expires_at = created_at
      WHERE expires_at = '';
    `);
    await db.exec(`
      UPDATE rooms
      SET room_expiration_value = 24
      WHERE room_expiration_value IS NULL;
    `);
    await db.exec(`
      UPDATE rooms
      SET room_expiration_unit = 'hours'
      WHERE room_expiration_unit IS NULL OR room_expiration_unit = '';
    `);
    await db.exec(`
      UPDATE rooms
      SET expires_at = created_at
      WHERE expires_at IS NULL;
    `);
    await db.exec(`
      UPDATE rooms
      SET expires_at = created_at
      WHERE TRIM(expires_at) = '';
    `);
    await db.exec(`
      UPDATE rooms
      SET expires_at = created_at
      WHERE expires_at = '0';
    `);
  }
}
