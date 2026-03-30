import type {
  CreateRoomData,
  MessageExpiration,
  RoomExpirationUnit,
  Room,
  RoomsRepository
} from "../repositories/roomsRepository.js";

const ALLOWED_PARTICIPANT_LIMITS = new Set([2, 3, 5, 10, 20]);
const ALLOWED_EXPIRATIONS = new Set<MessageExpiration>(["10m", "1h", "24h", "never"]);
const ALLOWED_ROOM_EXPIRATION_UNITS = new Set<RoomExpirationUnit>(["hours", "days"]);
const MAX_ROOM_NAME_LENGTH = 64;
const DEFAULT_ROOM_NAME = "Private Room RPG";

export type CreateRoomInput = {
  roomName?: string;
  creatorUserId?: string;
  maxParticipants: number;
  messageExpiration: MessageExpiration;
  allowImages: boolean;
  roomExpirationValue: number;
  roomExpirationUnit: RoomExpirationUnit;
};

export class InvalidRoomSettingsError extends Error {}
export class RoomNotFoundError extends Error {}
export class RoomExpiredError extends Error {}
export class RoomRenameForbiddenError extends Error {}

export class RoomsService {
  constructor(private readonly roomsRepository: RoomsRepository) {}

  async createRoom(input: CreateRoomInput): Promise<Room> {
    const normalizedRoomName = this.normalizeRoomName(input.roomName);
    const normalizedCreatorUserId = this.normalizeCreatorUserId(input.creatorUserId);
    this.validateInput(input, normalizedRoomName);
    const now = new Date();
    const expiresAt = this.calculateExpiresAt(
      input.roomExpirationValue,
      input.roomExpirationUnit,
      now
    );
    const createRoomData: CreateRoomData = {
      roomName: normalizedRoomName,
      creatorUserId: normalizedCreatorUserId,
      maxParticipants: input.maxParticipants,
      messageExpiration: input.messageExpiration,
      allowImages: input.allowImages,
      roomExpirationValue: input.roomExpirationValue,
      roomExpirationUnit: input.roomExpirationUnit,
      expiresAt
    };

    return await this.roomsRepository.create(createRoomData);
  }

  async renameRoom(roomId: string, requesterUserId: string, roomName: string): Promise<Room> {
    const room = await this.getRoomById(roomId);
    const normalizedRequesterUserId = requesterUserId.trim();
    if (!normalizedRequesterUserId || room.creatorUserId !== normalizedRequesterUserId) {
      throw new RoomRenameForbiddenError("Only room creator can rename the room");
    }

    const normalizedRoomName = this.normalizeRoomName(roomName);
    const updatedRoom = await this.roomsRepository.updateRoomName(roomId, normalizedRoomName);
    if (!updatedRoom) {
      throw new RoomNotFoundError("Room not found");
    }

    return updatedRoom;
  }

  async getRoomById(roomId: string): Promise<Room> {
    const room = await this.roomsRepository.findById(roomId);

    if (!room) {
      throw new RoomNotFoundError("Room not found");
    }

    if (this.isRoomExpired(room)) {
      throw new RoomExpiredError("Room expired");
    }

    return room;
  }

  isRoomExpired(room: Pick<Room, "expiresAt">): boolean {
    return new Date(room.expiresAt).getTime() <= Date.now();
  }

  private validateInput(input: CreateRoomInput, roomName: string): void {
    if (!ALLOWED_PARTICIPANT_LIMITS.has(input.maxParticipants)) {
      throw new InvalidRoomSettingsError("maxParticipants is invalid");
    }

    if (!ALLOWED_EXPIRATIONS.has(input.messageExpiration)) {
      throw new InvalidRoomSettingsError("messageExpiration is invalid");
    }

    if (!Number.isInteger(input.roomExpirationValue) || input.roomExpirationValue < 1) {
      throw new InvalidRoomSettingsError("roomExpirationValue is invalid");
    }

    if (!ALLOWED_ROOM_EXPIRATION_UNITS.has(input.roomExpirationUnit)) {
      throw new InvalidRoomSettingsError("roomExpirationUnit is invalid");
    }

    if (!roomName) {
      throw new InvalidRoomSettingsError("roomName is invalid");
    }
  }

  private normalizeRoomName(roomName?: string): string {
    const fallback = DEFAULT_ROOM_NAME;
    const resolved = typeof roomName === "string" ? roomName : fallback;
    const trimmed = resolved.trim();
    if (!trimmed) {
      return fallback;
    }

    return trimmed.slice(0, MAX_ROOM_NAME_LENGTH);
  }

  private normalizeCreatorUserId(creatorUserId?: string): string {
    if (typeof creatorUserId !== "string") {
      return "";
    }

    return creatorUserId.trim();
  }

  private calculateExpiresAt(
    value: number,
    unit: RoomExpirationUnit,
    now: Date
  ): string {
    const milliseconds = unit === "hours" ? value * 60 * 60 * 1000 : value * 24 * 60 * 60 * 1000;
    return new Date(now.getTime() + milliseconds).toISOString();
  }
}
