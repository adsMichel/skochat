import { randomUUID } from "node:crypto";
import type { CreateRoomData, Room, RoomsRepository } from "./roomsRepository.js";

export class InMemoryRoomsRepository implements RoomsRepository {
  private readonly rooms = new Map<string, Room>();

  create(data: CreateRoomData): Room {
    const room: Room = {
      id: randomUUID(),
      maxParticipants: data.maxParticipants,
      messageExpiration: data.messageExpiration,
      allowImages: data.allowImages,
      createdAt: new Date().toISOString()
    };

    this.rooms.set(room.id, room);
    return room;
  }
}
