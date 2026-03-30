import { randomUUID } from "node:crypto";
import type {
  ChatMessage,
  CreateMessageData,
  MessagesRepository
} from "./messagesRepository.js";

export class InMemoryMessagesRepository implements MessagesRepository {
  private readonly messagesByRoom = new Map<string, ChatMessage[]>();

  async create(data: CreateMessageData): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: randomUUID(),
      roomId: data.roomId,
      userId: data.userId ?? null,
      type: data.type,
      content: data.content,
      expiresAt: data.expiresAt ?? null,
      createdAt: new Date().toISOString()
    };

    const roomMessages = this.messagesByRoom.get(data.roomId) ?? [];
    roomMessages.push(message);
    this.messagesByRoom.set(data.roomId, roomMessages);
    return message;
  }

  async listByRoom(roomId: string, limit: number): Promise<ChatMessage[]> {
    const roomMessages = this.messagesByRoom.get(roomId) ?? [];
    const now = Date.now();
    const nonExpired = roomMessages.filter((message) => {
      if (!message.expiresAt) {
        return true;
      }

      return new Date(message.expiresAt).getTime() > now;
    });

    return nonExpired.slice(-limit);
  }

  async deleteExpired(nowIso: string): Promise<number> {
    const nowTimestamp = new Date(nowIso).getTime();
    let deletedCount = 0;

    this.messagesByRoom.forEach((messages, roomId) => {
      const nonExpired = messages.filter((message) => {
        if (!message.expiresAt) {
          return true;
        }

        return new Date(message.expiresAt).getTime() > nowTimestamp;
      });

      deletedCount += messages.length - nonExpired.length;

      if (nonExpired.length === 0) {
        this.messagesByRoom.delete(roomId);
        return;
      }

      this.messagesByRoom.set(roomId, nonExpired);
    });

    return deletedCount;
  }
}
