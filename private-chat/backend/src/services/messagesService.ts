import type { ChatMessage, MessagesRepository } from "../repositories/messagesRepository.js";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export class MessagesService {
  constructor(private readonly messagesRepository: MessagesRepository) {}

  async listRoomMessages(roomId: string, limit?: number): Promise<ChatMessage[]> {
    const safeLimit = this.resolveLimit(limit);
    return this.messagesRepository.listByRoom(roomId, safeLimit);
  }

  private resolveLimit(limit?: number): number {
    if (!limit || Number.isNaN(limit)) {
      return DEFAULT_LIMIT;
    }

    if (limit < 1) {
      return 1;
    }

    return Math.min(limit, MAX_LIMIT);
  }
}
