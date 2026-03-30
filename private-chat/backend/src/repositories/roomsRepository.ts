export type MessageExpiration = "10m" | "1h" | "24h" | "never";
export type RoomExpirationUnit = "hours" | "days";

export type Room = {
  id: string;
  roomName: string;
  creatorUserId: string;
  maxParticipants: number;
  messageExpiration: MessageExpiration;
  allowImages: boolean;
  roomExpirationValue: number;
  roomExpirationUnit: RoomExpirationUnit;
  expiresAt: string;
  createdAt: string;
};

export type CreateRoomData = {
  roomName: string;
  creatorUserId: string;
  maxParticipants: number;
  messageExpiration: MessageExpiration;
  allowImages: boolean;
  roomExpirationValue: number;
  roomExpirationUnit: RoomExpirationUnit;
  expiresAt: string;
};

export interface RoomsRepository {
  create(data: CreateRoomData): Promise<Room>;
  findById(id: string): Promise<Room | null>;
  updateRoomName(id: string, roomName: string): Promise<Room | null>;
  close?(): Promise<void>;
}
