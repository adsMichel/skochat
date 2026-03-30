import { describe, expect, it } from "vitest";
import { RoomWebSocketHub } from "../../websocket/roomWebSocketHub.js";

class FakeSocket {
  readyState = 1;
  sent: string[] = [];

  send(payload: string): void {
    this.sent.push(payload);
  }
}

describe("RoomWebSocketHub", () => {
  it("broadcasts message to room clients except sender", () => {
    const hub = new RoomWebSocketHub();
    const sender = new FakeSocket();
    const receiver = new FakeSocket();

    hub.addClient("room-1", sender);
    hub.addClient("room-1", receiver);

    hub.broadcast("room-1", '{"type":"message","content":"hello"}', sender);

    expect(sender.sent).toEqual([]);
    expect(receiver.sent).toEqual(['{"type":"message","content":"hello"}']);
  });

  it("removes client and skips closed sockets", () => {
    const hub = new RoomWebSocketHub();
    const closedSocket = new FakeSocket();
    const activeSocket = new FakeSocket();
    closedSocket.readyState = 3;

    hub.addClient("room-2", closedSocket);
    hub.addClient("room-2", activeSocket);
    hub.removeClient("room-2", closedSocket);

    hub.broadcast("room-2", "ping");

    expect(closedSocket.sent).toEqual([]);
    expect(activeSocket.sent).toEqual(["ping"]);
    expect(hub.getClientCount("room-2")).toBe(1);
  });
});
