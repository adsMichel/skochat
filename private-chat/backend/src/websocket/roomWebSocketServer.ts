import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { FastifyInstance } from "fastify";
import { WebSocketServer } from "ws";
import type WebSocket from "ws";
import type { ChatMessage, MessagesRepository } from "../repositories/messagesRepository.js";
import type { Room, RoomsRepository } from "../repositories/roomsRepository.js";
import { RoomWebSocketHub } from "./roomWebSocketHub.js";
import { PrivateRoomRpgEngine, type JoinProfile, type PublicPlayer } from "./rpgEngine.js";

type IncomingRoomMessage = {
  type?: string;
  content?: unknown;
  replyToMessageId?: unknown;
  action?: unknown;
};

const HISTORY_LIMIT = 50;
const roomSocketPathPattern = /^\/ws\/rooms\/([^/]+)$/;
const randomQuestions = [
  "What place would you like to visit together?",
  "What is your perfect weekend quest?",
  "Which fantasy class would you play in real life?"
];
const randomChallenges = [
  "Send a photo of what you're drinking",
  "Share your best playlist for tonight",
  "Describe your room in 3 fantasy words"
];

function parseRoomId(pathname: string): string | null {
  const match = pathname.match(roomSocketPathPattern);
  return match ? decodeURIComponent(match[1]) : null;
}

function sanitizeName(name: string | null, fallback: string): string {
  if (!name) {
    return fallback;
  }

  const trimmed = name.trim().slice(0, 24);
  return trimmed || fallback;
}

function buildJoinProfile(url: URL): JoinProfile {
  const userId = url.searchParams.get("userId")?.trim() || randomUUID();
  const fallbackName = `Player-${userId.slice(0, 4)}`;

  return {
    userId,
    name: sanitizeName(url.searchParams.get("name"), fallbackName),
    avatar: url.searchParams.get("avatar")?.trim() || "🧙",
    mood: url.searchParams.get("mood")?.trim() || "Friendly 😊"
  };
}

export type RoomConnectionDecision =
  | { allowed: true; room: Room }
  | { allowed: false; reason: "ROOM_NOT_FOUND" | "ROOM_FULL" | "ROOM_EXPIRED" };

export async function canConnectToRoom(
  roomId: string,
  roomsRepository: RoomsRepository,
  activeClientCount: number
): Promise<RoomConnectionDecision> {
  const room = await roomsRepository.findById(roomId);
  if (!room) {
    return { allowed: false, reason: "ROOM_NOT_FOUND" };
  }

  if (new Date(room.expiresAt).getTime() <= Date.now()) {
    return { allowed: false, reason: "ROOM_EXPIRED" };
  }

  if (activeClientCount >= room.maxParticipants) {
    return { allowed: false, reason: "ROOM_FULL" };
  }

  return { allowed: true, room };
}

export function calculateMessageExpiresAt(
  messageExpiration: Room["messageExpiration"],
  now = new Date()
): string | null {
  const nowTimestamp = now.getTime();

  if (messageExpiration === "never") {
    return null;
  }

  if (messageExpiration === "10m") {
    return new Date(nowTimestamp + 10 * 60 * 1000).toISOString();
  }

  if (messageExpiration === "1h") {
    return new Date(nowTimestamp + 60 * 60 * 1000).toISOString();
  }

  return new Date(nowTimestamp + 24 * 60 * 60 * 1000).toISOString();
}

function resolveMiniActionContent(action: string | undefined): string {
  if (action === "challenge") {
    return `🎯 Challenge: ${randomChallenges[Math.floor(Math.random() * randomChallenges.length)]}`;
  }

  return `🎲 Random Question: ${randomQuestions[Math.floor(Math.random() * randomQuestions.length)]}`;
}

function buildRoomStatePayload(
  roomId: string,
  players: PublicPlayer[],
  connectionLevel: number,
  maxPlayers: number
): string {
  return JSON.stringify({
    type: "room_state",
    roomId,
    players,
    connectionLevel,
    maxPlayers
  });
}

export function buildHistoryPayload(
  roomId: string,
  messages: ChatMessage[],
  players: PublicPlayer[]
): string {
  const playersById = new Map(players.map((player) => [player.id, player]));

  return JSON.stringify({
    type: "history",
    roomId,
    messages: messages.map((message) => {
      const sender = message.userId ? playersById.get(message.userId) : null;

      return {
        messageId: message.id,
        userId: message.userId,
        userName: sender?.name ?? "System",
        avatar: sender?.avatar ?? "🏆",
        mood: sender?.mood ?? "System",
        messageType: message.type,
        content: message.content,
        createdAt: message.createdAt
      };
    })
  });
}

function emitProgressEvents(
  roomId: string,
  result: NonNullable<ReturnType<PrivateRoomRpgEngine["handleAction"]>>,
  hub: RoomWebSocketHub
): void {
  if (result.xpGain > 0) {
    hub.broadcast(
      roomId,
      JSON.stringify({
        type: "user_xp_gain",
        roomId,
        userId: result.player.id,
        xpGain: result.xpGain,
        xp: result.player.xp,
        level: result.player.level
      })
    );
  }

  if (result.levelUpTo) {
    hub.broadcast(
      roomId,
      JSON.stringify({
        type: "level_up",
        roomId,
        userId: result.player.id,
        name: result.player.name,
        level: result.levelUpTo
      })
    );
  }

  result.achievementsUnlocked.forEach((achievementName) => {
    hub.broadcast(
      roomId,
      JSON.stringify({
        type: "achievement_unlocked",
        roomId,
        userId: result.player.id,
        name: result.player.name,
        achievement: achievementName
      })
    );
  });

  if (result.connectionLevelUpTo) {
    hub.broadcast(
      roomId,
      JSON.stringify({
        type: "connection_level_up",
        roomId,
        level: result.connectionLevelUpTo,
        hearts: "❤️".repeat(result.connectionLevelUpTo)
      })
    );
  }
}

export function attachRoomWebSocketServer(
  app: FastifyInstance,
  roomsRepository: RoomsRepository,
  messagesRepository: MessagesRepository
): void {
  const wsServer = new WebSocketServer({ noServer: true });
  const hub = new RoomWebSocketHub();
  const socketsByRoom = new Map<string, Set<WebSocket>>();
  const socketProfiles = new WeakMap<WebSocket, JoinProfile>();
  const rpgEngine = new PrivateRoomRpgEngine();

  const roomExpirationWatcher = setInterval(async () => {
    const roomIds = [...socketsByRoom.keys()];
    await Promise.all(
      roomIds.map(async (roomId) => {
        const room = await roomsRepository.findById(roomId);
        const expired = !room || new Date(room.expiresAt).getTime() <= Date.now();
        if (!expired) {
          return;
        }

        const sockets = socketsByRoom.get(roomId) ?? new Set<WebSocket>();
        sockets.forEach((socket) => {
          socket.close(1008, "Room expired");
        });
      })
    );

    const rewards = rpgEngine.runActiveRewardCycle();
    rewards.forEach(({ roomId, result }) => {
      emitProgressEvents(roomId, result, hub);
    });
  }, 30_000);

  app.server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url ?? "", "http://localhost");
    const roomId = parseRoomId(url.pathname);
    if (!roomId) {
      socket.destroy();
      return;
    }

    const profile = buildJoinProfile(url);
    wsServer.handleUpgrade(request, socket, head, (ws) => {
      wsServer.emit("connection", ws, request, roomId, profile);
    });
  });

  wsServer.on(
    "connection",
    (ws: WebSocket, _request: IncomingMessage, roomId: string, profile: JoinProfile) => {
      canConnectToRoom(roomId, roomsRepository, hub.getClientCount(roomId))
        .then(async (canConnect) => {
          if (!canConnect.allowed) {
            const closeReason =
              canConnect.reason === "ROOM_NOT_FOUND"
                ? "Room not found"
                : canConnect.reason === "ROOM_FULL"
                  ? "Room is full"
                  : "Room expired";
            ws.close(1008, closeReason);
            return;
          }

          socketProfiles.set(ws, profile);
          hub.addClient(roomId, ws);
          const roomSockets = socketsByRoom.get(roomId) ?? new Set<WebSocket>();
          roomSockets.add(ws);
          socketsByRoom.set(roomId, roomSockets);
          const room = canConnect.room;

          const player = rpgEngine.joinPlayer(roomId, profile);
          const players = rpgEngine.getPlayers(roomId);
          const connectionLevel = rpgEngine.getConnectionLevel(roomId);
          const recentMessages = await messagesRepository.listByRoom(roomId, HISTORY_LIMIT);

          ws.send(buildRoomStatePayload(roomId, players, connectionLevel, room.maxParticipants));
          ws.send(buildHistoryPayload(roomId, recentMessages, players));

          hub.broadcast(
            roomId,
            JSON.stringify({
              type: "user_join",
              roomId,
              player,
              playersCount: players.filter((item) => item.online).length,
              maxPlayers: room.maxParticipants
            })
          );

          ws.on("message", async (rawMessage: WebSocket.RawData) => {
            try {
              if (new Date(room.expiresAt).getTime() <= Date.now()) {
                ws.close(1008, "Room expired");
                return;
              }

              const incoming = JSON.parse(rawMessage.toString()) as IncomingRoomMessage;
              if (incoming.type === "user_update_profile") {
                const updatedPlayer = rpgEngine.joinPlayer(roomId, {
                  ...profile,
                  name: sanitizeName(String(incoming.content ?? profile.name), profile.name),
                  avatar: profile.avatar,
                  mood: profile.mood
                });
                hub.broadcast(
                  roomId,
                  JSON.stringify({
                    type: "user_join",
                    roomId,
                    player: updatedPlayer,
                    playersCount: rpgEngine.getPlayers(roomId).filter((item) => item.online).length,
                    maxPlayers: room.maxParticipants
                  })
                );
                return;
              }

              if (incoming.type !== "user_message" && incoming.type !== "user_image" && incoming.type !== "mini_action") {
                return;
              }

              const content =
                incoming.type === "mini_action"
                  ? resolveMiniActionContent(typeof incoming.action === "string" ? incoming.action : undefined)
                  : typeof incoming.content === "string"
                    ? incoming.content.trim()
                    : "";

              if (!content) {
                return;
              }

              const result = rpgEngine.handleAction(
                roomId,
                profile.userId,
                incoming.type,
                content,
                typeof incoming.replyToMessageId === "string" ? incoming.replyToMessageId : undefined
              );
              if (!result) {
                return;
              }

              const storedMessage = await messagesRepository.create({
                roomId,
                userId: incoming.type === "mini_action" ? null : profile.userId,
                type: incoming.type === "user_image" ? "image" : incoming.type === "mini_action" ? "system" : "text",
                content,
                expiresAt: calculateMessageExpiresAt(room.messageExpiration)
              });

              hub.broadcast(
                roomId,
                JSON.stringify({
                  type: "user_message",
                  roomId,
                  messageId: storedMessage.id,
                  userId: result.player.id,
                  userName: result.player.name,
                  avatar: result.player.avatar,
                  mood: result.player.mood,
                  messageType: storedMessage.type,
                  content: storedMessage.content,
                  createdAt: storedMessage.createdAt
                })
              );

              emitProgressEvents(roomId, result, hub);
            } catch {
              app.log.warn("invalid websocket payload");
            }
          });

          ws.on("close", () => {
            hub.removeClient(roomId, ws);
            const sockets = socketsByRoom.get(roomId);
            sockets?.delete(ws);
            if (sockets && sockets.size === 0) {
              socketsByRoom.delete(roomId);
            }

            const socketProfile = socketProfiles.get(ws);
            if (socketProfile) {
              rpgEngine.leavePlayer(roomId, socketProfile.userId);
            }
          });
        })
        .catch(() => {
          ws.close(1011, "Unexpected server error");
        });
    }
  );

  app.addHook("onClose", async () => {
    clearInterval(roomExpirationWatcher);
    wsServer.clients.forEach((client) => {
      client.close();
    });
    wsServer.close();
  });
}
