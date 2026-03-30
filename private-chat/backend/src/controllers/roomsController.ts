import type { FastifyReply, FastifyRequest } from "fastify";
import {
  InvalidRoomSettingsError,
  RoomExpiredError,
  RoomRenameForbiddenError,
  RoomNotFoundError,
  type CreateRoomInput,
  type RoomsService
} from "../services/roomsService.js";
import type { MessagesService } from "../services/messagesService.js";

type CreateRoomBody = Partial<CreateRoomInput>;
type GetRoomParams = {
  roomId: string;
};
type GetRoomMessagesQuery = {
  limit?: string;
};
type RenameRoomBody = {
  requesterUserId?: unknown;
  roomName?: unknown;
};

function isCreateRoomInput(body: CreateRoomBody): body is CreateRoomInput {
  const hasValidOptionalRoomName = body.roomName === undefined || typeof body.roomName === "string";
  const hasValidOptionalCreatorUserId =
    body.creatorUserId === undefined || typeof body.creatorUserId === "string";
  const hasValidOptionalExpirationValue =
    body.roomExpirationValue === undefined || typeof body.roomExpirationValue === "number";
  const hasValidOptionalExpirationUnit =
    body.roomExpirationUnit === undefined || typeof body.roomExpirationUnit === "string";

  return (
    typeof body.maxParticipants === "number" &&
    typeof body.messageExpiration === "string" &&
    typeof body.allowImages === "boolean" &&
    hasValidOptionalRoomName &&
    hasValidOptionalCreatorUserId &&
    hasValidOptionalExpirationValue &&
    hasValidOptionalExpirationUnit
  );
}

export function buildRoomsController(
  roomsService: RoomsService,
  messagesService: MessagesService
) {
  return {
    async createRoom(
      request: FastifyRequest<{ Body: CreateRoomBody }>,
      reply: FastifyReply
    ) {
      if (!isCreateRoomInput(request.body)) {
        return reply.code(400).send({ error: "Invalid room payload" });
      }

      try {
        const room = await roomsService.createRoom({
          ...request.body,
          roomExpirationValue: request.body.roomExpirationValue ?? 24,
          roomExpirationUnit: request.body.roomExpirationUnit ?? "hours"
        });
        return reply.code(201).send({
          roomId: room.id,
          roomName: room.roomName,
          creatorUserId: room.creatorUserId,
          link: `/room/${room.id}`,
          expiresAt: room.expiresAt
        });
      } catch (error) {
        if (error instanceof InvalidRoomSettingsError) {
          return reply.code(400).send({ error: error.message });
        }

        throw error;
      }
    },
    async getRoom(request: FastifyRequest<{ Params: GetRoomParams }>, reply: FastifyReply) {
      try {
        const room = await roomsService.getRoomById(request.params.roomId);
        return reply.code(200).send({
          roomId: room.id,
          roomName: room.roomName,
          creatorUserId: room.creatorUserId,
          maxParticipants: room.maxParticipants,
          messageExpiration: room.messageExpiration,
          allowImages: room.allowImages,
          roomExpirationValue: room.roomExpirationValue,
          roomExpirationUnit: room.roomExpirationUnit,
          expiresAt: room.expiresAt
        });
      } catch (error) {
        if (error instanceof RoomNotFoundError) {
          return reply.code(404).send({ error: error.message });
        }
        if (error instanceof RoomExpiredError) {
          return reply.code(410).send({ error: error.message });
        }

        throw error;
      }
    },
    async getRoomMessages(
      request: FastifyRequest<{ Params: GetRoomParams; Querystring: GetRoomMessagesQuery }>,
      reply: FastifyReply
    ) {
      try {
        const roomId = request.params.roomId;
        await roomsService.getRoomById(roomId);
        const limit = request.query.limit ? Number(request.query.limit) : undefined;
        const messages = await messagesService.listRoomMessages(roomId, limit);

        return reply.code(200).send({
          roomId,
          messages
        });
      } catch (error) {
        if (error instanceof RoomNotFoundError) {
          return reply.code(404).send({ error: error.message });
        }
        if (error instanceof RoomExpiredError) {
          return reply.code(410).send({ error: error.message });
        }

        throw error;
      }
    },
    async renameRoom(
      request: FastifyRequest<{ Params: GetRoomParams; Body: RenameRoomBody }>,
      reply: FastifyReply
    ) {
      const requesterUserId =
        typeof request.body?.requesterUserId === "string" ? request.body.requesterUserId : "";
      const roomName = typeof request.body?.roomName === "string" ? request.body.roomName : "";
      if (!requesterUserId || !roomName) {
        return reply.code(400).send({ error: "Invalid room rename payload" });
      }

      try {
        const room = await roomsService.renameRoom(request.params.roomId, requesterUserId, roomName);
        return reply.code(200).send({
          roomId: room.id,
          roomName: room.roomName
        });
      } catch (error) {
        if (error instanceof RoomNotFoundError) {
          return reply.code(404).send({ error: error.message });
        }
        if (error instanceof RoomExpiredError) {
          return reply.code(410).send({ error: error.message });
        }
        if (error instanceof RoomRenameForbiddenError) {
          return reply.code(403).send({ error: error.message });
        }
        if (error instanceof InvalidRoomSettingsError) {
          return reply.code(400).send({ error: error.message });
        }

        throw error;
      }
    }
  };
}
