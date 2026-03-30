function resolveSocketBase(origin) {
  const url = new URL(origin);
  const protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${url.host}`;
}

export function getRoomSocketUrl(roomId, origin = window.location.origin) {
  return getRoomSocketUrlWithProfile(roomId, {}, origin);
}

export function getRoomSocketUrlWithProfile(roomId, profile, origin = window.location.origin) {
  const socketBase = resolveSocketBase(origin);
  const params = new URLSearchParams();

  if (profile.userId) {
    params.set("userId", profile.userId);
  }
  if (profile.name) {
    params.set("name", profile.name);
  }
  if (profile.avatar) {
    params.set("avatar", profile.avatar);
  }
  if (profile.mood) {
    params.set("mood", profile.mood);
  }

  const query = params.toString();
  const querySuffix = query ? `?${query}` : "";
  return `${socketBase}/ws/rooms/${encodeURIComponent(roomId)}${querySuffix}`;
}

export function connectRoomSocket(
  roomId,
  profile = {},
  handlers = {},
  socketFactory = (url) => new WebSocket(url),
  origin = window.location.origin
) {
  const url = getRoomSocketUrlWithProfile(roomId, profile, origin);
  const socket = socketFactory(url);

  socket.addEventListener("open", () => {
    handlers.onOpen?.();
  });

  socket.addEventListener("message", (event) => {
    handlers.onMessage?.(event.data);
  });

  socket.addEventListener("close", () => {
    handlers.onClose?.();
  });

  socket.addEventListener("error", (event) => {
    handlers.onError?.(event);
  });

  return {
    url,
    sendEvent(eventPayload) {
      if (socket.readyState !== 1) {
        throw new Error("Socket is not connected");
      }

      socket.send(JSON.stringify(eventPayload));
    },
    disconnect() {
      socket.close();
    }
  };
}
