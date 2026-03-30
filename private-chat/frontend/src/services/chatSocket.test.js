import { describe, expect, it, vi } from "vitest";
import {
  connectRoomSocket,
  getRoomSocketUrl,
  getRoomSocketUrlWithProfile
} from "./chatSocket.js";

class FakeSocket {
  static OPEN = 1;

  constructor(url) {
    this.url = url;
    this.readyState = FakeSocket.OPEN;
    this.listeners = new Map();
    this.sent = [];
  }

  addEventListener(type, callback) {
    const list = this.listeners.get(type) ?? [];
    list.push(callback);
    this.listeners.set(type, list);
  }

  send(payload) {
    this.sent.push(payload);
  }

  close() {
    this.readyState = 3;
  }
}

describe("chatSocket", () => {
  it("builds ws url for room", () => {
    expect(getRoomSocketUrl("room-123", "http://localhost:5173")).toBe(
      "ws://localhost:5173/ws/rooms/room-123"
    );
    expect(getRoomSocketUrl("room-123", "https://chat.example.com")).toBe(
      "wss://chat.example.com/ws/rooms/room-123"
    );
  });

  it("builds ws url with profile query params", () => {
    const url = getRoomSocketUrlWithProfile(
      "room-1",
      {
        userId: "u1",
        name: "Michel",
        avatar: "🧙",
        mood: "Friendly 😊"
      },
      "http://localhost:5173"
    );

    expect(url).toContain("ws://localhost:5173/ws/rooms/room-1?");
    expect(url).toContain("userId=u1");
    expect(url).toContain("name=Michel");
  });

  it("sends message through socket connection", () => {
    let fakeSocket;
    const onOpen = vi.fn();
    const connection = connectRoomSocket(
      "room-1",
      {},
      { onOpen },
      (url) => {
        fakeSocket = new FakeSocket(url);
        return fakeSocket;
      },
      "http://localhost:5173"
    );

    fakeSocket.listeners.get("open")[0]();
    connection.sendEvent({ type: "user_message", content: "hello" });

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(fakeSocket.url).toBe("ws://localhost:5173/ws/rooms/room-1");
    expect(fakeSocket.sent).toEqual(['{"type":"user_message","content":"hello"}']);
  });
});
