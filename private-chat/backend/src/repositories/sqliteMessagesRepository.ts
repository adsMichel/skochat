import { randomUUID } from "node:crypto";
import { open, type Database } from "sqlite";
import sqlite3 from "sqlite3";
import type {
  ChatMessage,
  CreateMessageData,
  MessagesRepository
} from "./messagesRepository.js";

function resolveSqliteFilename(databaseUrl: string): string {
  if (databaseUrl === ":memory:") {
    return databaseUrl;
  }

  if (!databaseUrl.startsWith("file:")) {
    throw new Error("DATABASE_URL must use file: prefix for sqlite");
  }

  return databaseUrl.slice(5);
}

export class SqliteMessagesRepository implements MessagesRepository {
  private readonly dbPromise: Promise<Database>;

  constructor(databaseUrl: string) {
    this.dbPromise = this.initialize(databaseUrl);
  }

  async create(data: CreateMessageData): Promise<ChatMessage> {
    const db = await this.dbPromise;
    const id = randomUUID();
    const createdAt = new Date().toISOString();

    await db.run(
      `
        INSERT INTO messages (id, room_id, user_id, type, content, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      id,
      data.roomId,
      data.userId ?? null,
      data.type,
      data.content,
      data.expiresAt ?? null,
      createdAt
    );

    return {
      id,
      roomId: data.roomId,
      userId: data.userId ?? null,
      type: data.type,
      content: data.content,
      expiresAt: data.expiresAt ?? null,
      createdAt
    };
  }

  async listByRoom(roomId: string, limit: number): Promise<ChatMessage[]> {
    const db = await this.dbPromise;
    const rows = await db.all<{
      id: string;
      room_id: string;
      user_id: string | null;
      type: ChatMessage["type"];
      content: string;
      expires_at: string | null;
      created_at: string;
    }[]>(
      `
        SELECT id, room_id, user_id, type, content, expires_at, created_at
        FROM messages
        WHERE room_id = ?
          AND (expires_at IS NULL OR expires_at > ?)
        ORDER BY rowid DESC
        LIMIT ?
      `,
      roomId,
      new Date().toISOString(),
      limit
    );

    return rows
      .map((row) => ({
        id: row.id,
        roomId: row.room_id,
        userId: row.user_id,
        type: row.type,
        content: row.content,
        expiresAt: row.expires_at,
        createdAt: row.created_at
      }))
      .reverse();
  }

  async deleteExpired(nowIso: string): Promise<number> {
    const db = await this.dbPromise;
    const result = await db.run(
      `
        DELETE FROM messages
        WHERE expires_at IS NOT NULL
          AND expires_at <= ?
      `,
      nowIso
    );

    return result.changes ?? 0;
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

    await db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL,
        user_id TEXT,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        expires_at TEXT,
        created_at TEXT NOT NULL
      );
    `);

    const columns = (await db.all("PRAGMA table_info(messages)")) as Array<{ name: string }>;
    const columnNames = new Set(columns.map((column) => column.name));

    if (!columnNames.has("user_id")) {
      await db.exec("ALTER TABLE messages ADD COLUMN user_id TEXT;");
    }

    if (!columnNames.has("expires_at")) {
      await db.exec("ALTER TABLE messages ADD COLUMN expires_at TEXT;");
    }

    return db;
  }
}
