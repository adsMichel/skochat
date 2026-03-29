import type {
  CreateRoomData,
  MessageExpiration,
  Room,
  RoomsRepository
} from "../repositories/roomsRepository.js";

const ALLOWED_PARTICIPANT_LIMITS = new Set([2, 3, 5, 10, 20]);
const ALLOWED_EXPIRATIONS = new Set<MessageExpiration>(["10m", "1h", "24h", "never"]);

export type CreateRoomInput = {
  maxParticipants: number;
  messageExpiration: MessageExpiration;
  allowImages: boolean;
};

export class InvalidRoomSettingsError extends Error {}

export class RoomsService {
  constructor(private readonly roomsRepository: RoomsRepository) {}

  createRoom(input: CreateRoomInput): Room {
    this.validateInput(input);
    const createRoomData: CreateRoomData = {
      maxParticipants: input.maxParticipants,
      messageExpiration: input.messageExpiration,
      allowImages: input.allowImages
    };

    return this.roomsRepository.create(createRoomData);
  }

  private validateInput(input: CreateRoomInput): void {
    if (!ALLOWED_PARTICIPANT_LIMITS.has(input.maxParticipants)) {
      throw new InvalidRoomSettingsError("maxParticipants is invalid");
    }

    if (!ALLOWED_EXPIRATIONS.has(input.messageExpiration)) {
      throw new InvalidRoomSettingsError("messageExpiration is invalid");
    }
  }
}
