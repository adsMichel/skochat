export async function createRoom(payload) {
  const response = await fetch("/api/rooms", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? "Failed to create room");
  }

  return body;
}

export async function getRoom(roomId) {
  const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}`);
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? "Failed to load room");
  }

  return body;
}

export async function updateRoomName(roomId, payload) {
  const response = await fetch(`/api/rooms/${encodeURIComponent(roomId)}/name`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error ?? "Failed to rename room");
  }

  return body;
}
