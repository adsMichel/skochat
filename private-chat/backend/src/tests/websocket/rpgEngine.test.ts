import { describe, expect, it } from "vitest";
import { PrivateRoomRpgEngine } from "../../websocket/rpgEngine.js";

describe("PrivateRoomRpgEngine", () => {
  it("joins player and grants xp on message", () => {
    const engine = new PrivateRoomRpgEngine();
    const player = engine.joinPlayer("room-1", {
      userId: "u1",
      name: "Michel",
      avatar: "🧙",
      mood: "Friendly 😊"
    });

    expect(player.level).toBe(1);

    const result = engine.handleAction("room-1", "u1", "user_message", "hello there");
    expect(result?.xpGain).toBe(5);
    expect(result?.player.xp).toBe(5);
    expect(result?.achievementsUnlocked).toContain("First Message");
  });

  it("levels up and updates connection level", () => {
    const engine = new PrivateRoomRpgEngine();
    engine.joinPlayer("room-2", {
      userId: "u2",
      name: "Maria",
      avatar: "🧝",
      mood: "Flirty 😏"
    });

    let lastResult = null;
    for (let i = 0; i < 10; i += 1) {
      lastResult = engine.handleAction("room-2", "u2", "user_message", "msg");
    }

    expect(lastResult?.player.level).toBeGreaterThanOrEqual(2);
    expect(engine.getConnectionLevel("room-2")).toBeGreaterThanOrEqual(2);
  });
});
