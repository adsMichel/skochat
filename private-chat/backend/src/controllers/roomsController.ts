import type { FastifyReply, FastifyRequest } from "fastify";
import {
  InvalidRoomSettingsError,
  type CreateRoomInput,
  type RoomsService
} from "../services/roomsService.js";

type CreateRoomBody = Partial<CreateRoomInput>;

function isCreateRoomInput(body: CreateRoomBody): body is CreateRoomInput {
  return (
    typeof body.maxParticipants === "number" &&
    typeof body.messageExpiration === "string" &&
    typeof body.allowImages === "boolean"
  );
}

export function buildRoomsController(roomsService: RoomsService) {
  return {
    async createRoom(
      request: FastifyRequest<{ Body: CreateRoomBody }>,
      reply: FastifyReply
    ) {
      if (!isCreateRoomInput(request.body)) {
        return reply.code(400).send({ error: "Invalid room payload" });
      }

      try {
        const room = await roomsService.createRoom(request.body);
        return reply.code(201).send({
          roomId: room.id,
          link: `/room/${room.id}`
        });
      } catch (error) {
        if (error instanceof InvalidRoomSettingsError) {
          return reply.code(400).send({ error: error.message });
        }

        throw error;
      }
    }
  };
}
