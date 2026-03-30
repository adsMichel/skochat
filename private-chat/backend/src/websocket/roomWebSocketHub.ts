type WebSocketLike = {
  readyState: number;
  send(payload: string): void;
};

const SOCKET_OPEN = 1;

export class RoomWebSocketHub {
  private readonly rooms = new Map<string, Set<WebSocketLike>>();

  addClient(roomId: string, socket: WebSocketLike): void {
    const roomClients = this.rooms.get(roomId) ?? new Set<WebSocketLike>();
    roomClients.add(socket);
    this.rooms.set(roomId, roomClients);
  }

  removeClient(roomId: string, socket: WebSocketLike): void {
    const roomClients = this.rooms.get(roomId);

    if (!roomClients) {
      return;
    }

    roomClients.delete(socket);

    if (roomClients.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  getClientCount(roomId: string): number {
    const roomClients = this.rooms.get(roomId);
    return roomClients ? roomClients.size : 0;
  }

  broadcast(roomId: string, payload: string, sender?: WebSocketLike): void {
    const roomClients = this.rooms.get(roomId);

    if (!roomClients) {
      return;
    }

    roomClients.forEach((client) => {
      if (sender && client === sender) {
        return;
      }

      if (client.readyState === SOCKET_OPEN) {
        client.send(payload);
      }
    });
  }
}
