import Fastify, { type FastifyInstance } from "fastify";
import { buildRoomsController } from "./controllers/roomsController.js";
import { InMemoryRoomsRepository } from "./repositories/inMemoryRoomsRepository.js";
import { SqliteRoomsRepository } from "./repositories/sqliteRoomsRepository.js";
import type { RoomsRepository } from "./repositories/roomsRepository.js";
import { RoomsService } from "./services/roomsService.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });
  const roomsRepository = buildRoomsRepository();
  const roomsService = new RoomsService(roomsRepository);
  const roomsController = buildRoomsController(roomsService);

  app.get("/health", async () => ({ status: "ok" }));
  app.post("/rooms", roomsController.createRoom);
  app.addHook("onClose", async () => {
    if (roomsRepository.close) {
      await roomsRepository.close();
    }
  });

  return app;
}

function buildRoomsRepository(): RoomsRepository {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return new SqliteRoomsRepository(databaseUrl);
  }

  return new InMemoryRoomsRepository();
}
