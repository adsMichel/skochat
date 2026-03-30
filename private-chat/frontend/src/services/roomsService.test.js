import { afterEach, describe, expect, it, vi } from "vitest";
import { createRoom, getRoom, updateRoomName } from "./roomsService.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createRoom", () => {
  it("sends room payload and returns backend response", async () => {
    const fakeResponse = {
      roomId: "11111111-1111-4111-8111-111111111111",
      link: "/room/11111111-1111-4111-8111-111111111111"
    };

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeResponse
    });

    vi.stubGlobal("fetch", fetchMock);

    const payload = {
      maxParticipants: 5,
      messageExpiration: "1h",
      allowImages: true,
      roomExpirationValue: 24,
      roomExpirationUnit: "hours"
    };
    const result = await createRoom(payload);

    expect(fetchMock).toHaveBeenCalledWith("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    expect(result).toEqual(fakeResponse);
  });

  it("throws backend error message when request fails", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "maxParticipants is invalid" })
    });

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createRoom({
        maxParticipants: 4,
        messageExpiration: "1h",
        allowImages: true,
        roomExpirationValue: 24,
        roomExpirationUnit: "hours"
      })
    ).rejects.toThrow("maxParticipants is invalid");
  });
});

describe("getRoom", () => {
  it("loads room details", async () => {
    const fakeResponse = {
      roomId: "11111111-1111-4111-8111-111111111111",
      roomName: "Private Room RPG",
      creatorUserId: "owner-1"
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeResponse
    });

    vi.stubGlobal("fetch", fetchMock);
    const result = await getRoom(fakeResponse.roomId);

    expect(fetchMock).toHaveBeenCalledWith(`/api/rooms/${fakeResponse.roomId}`);
    expect(result).toEqual(fakeResponse);
  });
});

describe("updateRoomName", () => {
  it("sends patch payload and returns updated name", async () => {
    const roomId = "11111111-1111-4111-8111-111111111111";
    const payload = {
      requesterUserId: "owner-1",
      roomName: "My New Room"
    };
    const fakeResponse = {
      roomId,
      roomName: "My New Room"
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeResponse
    });

    vi.stubGlobal("fetch", fetchMock);
    const result = await updateRoomName(roomId, payload);

    expect(fetchMock).toHaveBeenCalledWith(`/api/rooms/${roomId}/name`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    expect(result).toEqual(fakeResponse);
  });
});
