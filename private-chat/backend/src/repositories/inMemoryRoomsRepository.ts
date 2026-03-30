import { randomUUID } from "node:crypto";
import type { CreateRoomData, Room, RoomsRepository } from "./roomsRepository.js";

export class InMemoryRoomsRepository implements RoomsRepository {
  private readonly rooms = new Map<string, Room>();

  async create(data: CreateRoomData): Promise<Room> {
    const room: Room = {
      id: randomUUID(),
      roomName: data.roomName,
      creatorUserId: data.creatorUserId,
      maxParticipants: data.maxParticipants,
      messageExpiration: data.messageExpiration,
      allowImages: data.allowImages,
      roomExpirationValue: data.roomExpirationValue,
      roomExpirationUnit: data.roomExpirationUnit,
      expiresAt: data.expiresAt,
      createdAt: new Date().toISOString()
    };

    this.rooms.set(room.id, room);
    return room;
  }

  async findById(id: string): Promise<Room | null> {
    return this.rooms.get(id) ?? null;
  }

  async updateRoomName(id: string, roomName: string): Promise<Room | null> {
    const room = this.rooms.get(id);
    if (!room) {
      return null;
    }

    const updated: Room = {
      ...room,
      roomName
    };
    this.rooms.set(id, updated);
    return updated;
  }
}
