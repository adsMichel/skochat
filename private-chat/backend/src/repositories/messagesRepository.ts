export type ChatMessageType = "text" | "image" | "system";

export type ChatMessage = {
  id: string;
  roomId: string;
  userId: string | null;
  type: ChatMessageType;
  content: string;
  expiresAt: string | null;
  createdAt: string;
};

export type CreateMessageData = {
  roomId: string;
  userId?: string | null;
  type: ChatMessageType;
  content: string;
  expiresAt?: string | null;
};

export interface MessagesRepository {
  create(data: CreateMessageData): Promise<ChatMessage>;
  listByRoom(roomId: string, limit: number): Promise<ChatMessage[]>;
  deleteExpired(nowIso: string): Promise<number>;
  close?(): Promise<void>;
}
