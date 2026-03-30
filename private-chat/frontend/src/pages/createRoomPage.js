import { createRoom } from "../services/roomsService.js";

const participantOptions = [2, 3, 5, 10, 20];
const expirationOptions = [
  { value: "10m", label: "10 minutos" },
  { value: "1h", label: "1 hora" },
  { value: "24h", label: "24 horas" },
  { value: "never", label: "Nunca" }
];
const roomExpirationUnitOptions = [
  { value: "hours", label: "Horas" },
  { value: "days", label: "Dias" }
];
const DEFAULT_ROOM_NAME = "Private Room RPG";
const PROFILE_STORAGE_KEY = "private-room-rpg-profile";

function getOrCreateCreatorId() {
  const fallback = window.crypto.randomUUID();
  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify({
        userId: fallback,
        name: "Adventurer",
        avatar: "🧙",
        mood: "Friendly 😊"
      })
    );
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.userId === "string" && parsed.userId.trim()) {
      return parsed.userId;
    }

    const next = {
      ...parsed,
      userId: fallback
    };
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
    return fallback;
  } catch {
    window.localStorage.setItem(
      PROFILE_STORAGE_KEY,
      JSON.stringify({
        userId: fallback,
        name: "Adventurer",
        avatar: "🧙",
        mood: "Friendly 😊"
      })
    );
    return fallback;
  }
}

export function renderCreateRoomPage(container) {
  container.innerHTML = `
    <main>
      <h1>Private Chat</h1>
      <p>Crie uma sala privada e compartilhe o link.</p>

      <form id="create-room-form">
        <label for="maxParticipants">Limite de participantes</label>
        <select id="maxParticipants" name="maxParticipants" required>
          ${participantOptions.map((value) => `<option value="${value}">${value}</option>`).join("")}
        </select>

        <label for="messageExpiration">Expiração de mensagens</label>
        <select id="messageExpiration" name="messageExpiration" required>
          ${expirationOptions.map((option) => `<option value="${option.value}">${option.label}</option>`).join("")}
        </select>

        <label for="roomExpirationValue">Expiração da sala</label>
        <input
          id="roomExpirationValue"
          name="roomExpirationValue"
          type="number"
          min="1"
          step="1"
          value="24"
          required
        />
        <select id="roomExpirationUnit" name="roomExpirationUnit" required>
          ${roomExpirationUnitOptions.map((option) => `<option value="${option.value}">${option.label}</option>`).join("")}
        </select>

        <label for="allowImages">
          <input type="checkbox" id="allowImages" name="allowImages" />
          Permitir envio de imagens
        </label>

        <label for="roomName">Nome da sala</label>
        <input
          id="roomName"
          name="roomName"
          type="text"
          maxlength="64"
          value="${DEFAULT_ROOM_NAME}"
          required
        />

        <button type="submit">Criar sala</button>
      </form>

      <p id="form-feedback" role="status"></p>
    </main>
  `;

  const form = container.querySelector("#create-room-form");
  const feedback = container.querySelector("#form-feedback");

  if (!(form instanceof HTMLFormElement) || !(feedback instanceof HTMLElement)) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(form);
    const creatorUserId = getOrCreateCreatorId();
    const payload = {
      maxParticipants: Number(formData.get("maxParticipants")),
      messageExpiration: String(formData.get("messageExpiration")),
      allowImages: formData.get("allowImages") === "on",
      roomExpirationValue: Number(formData.get("roomExpirationValue")),
      roomExpirationUnit: String(formData.get("roomExpirationUnit")),
      roomName: String(formData.get("roomName") ?? DEFAULT_ROOM_NAME),
      creatorUserId
    };

    feedback.textContent = "Criando sala...";

    try {
      const room = await createRoom(payload);
      const absoluteLink = `${window.location.origin}${room.link}`;
      const expirationText = room.expiresAt
        ? new Date(room.expiresAt).toLocaleString("pt-BR")
        : "n/a";
      feedback.innerHTML = `Sala criada: <a href="${room.link}">${absoluteLink}</a> (expira em ${expirationText})`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao criar sala";
      feedback.textContent = message;
    }
  });
}
