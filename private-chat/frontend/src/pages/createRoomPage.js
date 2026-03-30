import { createRoom } from "../services/roomsService.js";

const participantOptions = [2, 3, 5, 10, 20];
const expirationOptions = [
  { value: "10m", label: "10 minutos" },
  { value: "1h", label: "1 hora" },
  { value: "24h", label: "24 horas" },
  { value: "never", label: "Nunca" }
];

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

        <label for="allowImages">
          <input type="checkbox" id="allowImages" name="allowImages" />
          Permitir envio de imagens
        </label>

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
    const payload = {
      maxParticipants: Number(formData.get("maxParticipants")),
      messageExpiration: String(formData.get("messageExpiration")),
      allowImages: formData.get("allowImages") === "on"
    };

    feedback.textContent = "Criando sala...";

    try {
      const room = await createRoom(payload);
      const absoluteLink = `${window.location.origin}${room.link}`;
      feedback.innerHTML = `Sala criada: <a href="${room.link}">${absoluteLink}</a>`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao criar sala";
      feedback.textContent = message;
    }
  });
}
