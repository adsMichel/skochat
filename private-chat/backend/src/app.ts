import Fastify, { type FastifyInstance } from "fastify";
import { buildRoomsController } from "./controllers/roomsController.js";
import { InMemoryMessagesRepository } from "./repositories/inMemoryMessagesRepository.js";
import { InMemoryRoomsRepository } from "./repositories/inMemoryRoomsRepository.js";
import type { MessagesRepository } from "./repositories/messagesRepository.js";
import { SqliteRoomsRepository } from "./repositories/sqliteRoomsRepository.js";
import { SqliteMessagesRepository } from "./repositories/sqliteMessagesRepository.js";
import type { RoomsRepository } from "./repositories/roomsRepository.js";
import { MessagesService } from "./services/messagesService.js";
import { RoomsService } from "./services/roomsService.js";
import { attachRoomWebSocketServer } from "./websocket/roomWebSocketServer.js";
import { startMessageExpirationWorker } from "./workers/messageExpirationWorker.js";

export function buildApp(): FastifyInstance {
  const app = Fastify({ logger: true });
  const roomsRepository = buildRoomsRepository();
  const messagesRepository = buildMessagesRepository();
  const roomsService = new RoomsService(roomsRepository);
  const messagesService = new MessagesService(messagesRepository);
  const roomsController = buildRoomsController(roomsService, messagesService);

  app.get("/health", async () => ({ status: "ok" }));
  app.post("/rooms", roomsController.createRoom);
  app.get("/rooms/:roomId", roomsController.getRoom);
  app.patch("/rooms/:roomId/name", roomsController.renameRoom);
  app.get("/rooms/:roomId/messages", roomsController.getRoomMessages);
  attachRoomWebSocketServer(app, roomsRepository, messagesRepository);
  const stopMessageExpirationWorker = startMessageExpirationWorker(messagesRepository);
  app.addHook("onClose", async () => {
    stopMessageExpirationWorker();
    if (roomsRepository.close) {
      await roomsRepository.close();
    }
    if (messagesRepository.close) {
      await messagesRepository.close();
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

function buildMessagesRepository(): MessagesRepository {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    return new SqliteMessagesRepository(databaseUrl);
  }

  return new InMemoryMessagesRepository();
}
