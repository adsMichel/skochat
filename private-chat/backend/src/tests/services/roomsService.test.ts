import { describe, expect, it } from "vitest";
import type { CreateRoomData, Room, RoomsRepository } from "../../repositories/roomsRepository.js";
import {
  RoomExpiredError,
  RoomRenameForbiddenError,
  RoomsService
} from "../../services/roomsService.js";

class FakeRoomsRepository implements RoomsRepository {
  public createdData: CreateRoomData | null = null;
  public roomToFind: Room | null = null;

  async create(data: CreateRoomData): Promise<Room> {
    this.createdData = data;
    return {
      id: "room-test",
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
  }

  async findById(_id: string): Promise<Room | null> {
    return this.roomToFind;
  }

  async updateRoomName(_id: string, roomName: string): Promise<Room | null> {
    if (!this.roomToFind) {
      return null;
    }

    this.roomToFind = {
      ...this.roomToFind,
      roomName
    };
    return this.roomToFind;
  }
}

describe("RoomsService", () => {
  it("calculates expiresAt using hours", async () => {
    const repository = new FakeRoomsRepository();
    const service = new RoomsService(repository);
    const before = Date.now();

    await service.createRoom({
      maxParticipants: 5,
      messageExpiration: "1h",
      allowImages: true,
      roomExpirationValue: 2,
      roomExpirationUnit: "hours"
    });

    expect(repository.createdData).not.toBeNull();
    const expiresAt = new Date(repository.createdData!.expiresAt).getTime();
    expect(expiresAt).toBeGreaterThanOrEqual(before + 2 * 60 * 60 * 1000 - 2000);
  });

  it("throws RoomExpiredError when room is expired", async () => {
    const repository = new FakeRoomsRepository();
    repository.roomToFind = {
      id: "room-1",
      roomName: "Private Room RPG",
      creatorUserId: "owner-1",
      maxParticipants: 5,
      messageExpiration: "1h",
      allowImages: true,
      roomExpirationValue: 1,
      roomExpirationUnit: "hours",
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    const service = new RoomsService(repository);

    await expect(service.getRoomById("room-1")).rejects.toBeInstanceOf(RoomExpiredError);
  });

  it("renames room when requester is creator", async () => {
    const repository = new FakeRoomsRepository();
    repository.roomToFind = {
      id: "room-1",
      roomName: "Old Name",
      creatorUserId: "owner-1",
      maxParticipants: 5,
      messageExpiration: "1h",
      allowImages: true,
      roomExpirationValue: 1,
      roomExpirationUnit: "hours",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: new Date().toISOString()
    };
    const service = new RoomsService(repository);

    const room = await service.renameRoom("room-1", "owner-1", "New Name");
    expect(room.roomName).toBe("New Name");
  });

  it("rejects rename when requester is not creator", async () => {
    const repository = new FakeRoomsRepository();
    repository.roomToFind = {
      id: "room-1",
      roomName: "Old Name",
      creatorUserId: "owner-1",
      maxParticipants: 5,
      messageExpiration: "1h",
      allowImages: true,
      roomExpirationValue: 1,
      roomExpirationUnit: "hours",
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      createdAt: new Date().toISOString()
    };
    const service = new RoomsService(repository);

    await expect(service.renameRoom("room-1", "user-2", "New Name")).rejects.toBeInstanceOf(
      RoomRenameForbiddenError
    );
  });
});
