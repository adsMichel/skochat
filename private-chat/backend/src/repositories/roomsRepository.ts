export type MessageExpiration = "10m" | "1h" | "24h" | "never";

export type Room = {
  id: string;
  maxParticipants: number;
  messageExpiration: MessageExpiration;
  allowImages: boolean;
  createdAt: string;
};

export type CreateRoomData = {
  maxParticipants: number;
  messageExpiration: MessageExpiration;
  allowImages: boolean;
};

export interface RoomsRepository {
  create(data: CreateRoomData): Room;
}
