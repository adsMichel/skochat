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
