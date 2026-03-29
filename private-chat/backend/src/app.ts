import Fastify, { type FastifyInstance } from "fastify";
import { buildRoomsController } from "./controllers/roomsController.js";
import { InMemoryRoomsRepository } from "./repositories/inMemoryRoomsRepository.js";
import { RoomsService } from "./services/roomsService.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });
  const roomsRepository = new InMemoryRoomsRepository();
  const roomsService = new RoomsService(roomsRepository);
  const roomsController = buildRoomsController(roomsService);

  app.get("/health", async () => ({ status: "ok" }));
  app.post("/rooms", roomsController.createRoom);

  return app;
}
