import { appendUserMessage, renderHistory } from "../components/chatFeed.js";
import { renderPlayerPanel } from "../components/playerPanel.js";
import { connectRoomSocket } from "../services/chatSocket.js";
import { getRoom, updateRoomName } from "../services/roomsService.js";
import "../styles/rpg.css";

const avatarOptions = ["🧙", "🧝", "🧛", "🐺", "🦊"];
const moodOptions = ["Friendly 😊", "Flirty 😏", "Chill 😌", "Hot 🔥", "Playful 😜"];
const DEFAULT_ROOM_NAME = "Private Room RPG";
const PROFILE_STORAGE_KEY = "private-room-rpg-profile";
const NOTIFICATIONS_STORAGE_KEY = "private-room-rpg-notifications-enabled";

function getStoredProfile() {
  const raw = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  const base = {
    userId: window.crypto.randomUUID(),
    name: "Adventurer",
    avatar: "🧙",
    mood: "Friendly 😊"
  };

  if (!raw) {
    return base;
  }

  try {
    const parsed = JSON.parse(raw);
    return {
      userId: parsed.userId || base.userId,
      name: parsed.name || base.name,
      avatar: parsed.avatar || base.avatar,
      mood: parsed.mood || base.mood
    };
  } catch {
    return base;
  }
}

function saveProfile(profile) {
  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function getStoredNotificationsEnabled() {
  const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
  if (raw === null) {
    return true;
  }

  return raw === "true";
}

function saveNotificationsEnabled(enabled) {
  window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, String(enabled));
}

function buildSelectOptions(options, selected) {
  return options
    .map((option) => {
      const isSelected = option === selected ? "selected" : "";
      return `<option value="${option}" ${isSelected}>${option}</option>`;
    })
    .join("");
}

function normalizeImageInput(rawValue) {
  const value = rawValue.trim();
  if (!value) {
    return "";
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (/^www\./i.test(value)) {
    return `https://${value}`;
  }

  return value;
}

export function renderRoomPage(container, roomId) {
  document.body.classList.add("room-page-active");
  let profile = getStoredProfile();
  let notificationsEnabled = getStoredNotificationsEnabled();
  let connection = null;
  const state = {
    players: new Map(),
    maxPlayers: null,
    roomName: DEFAULT_ROOM_NAME,
    creatorUserId: "",
    notifications: [],
    unreadNotifications: 0
  };

  container.innerHTML = `
    <main class="rpg-layout compact-layout">
      <section class="rpg-content chat-focus-layout">
        <div id="players-panel"></div>
        <section class="rpg-panel chat-panel">
          <div class="chat-toolbar">
            <h2 id="room-title">${DEFAULT_ROOM_NAME}</h2>
            <div class="toolbar-actions">
              <button id="notifications-toggle" class="icon-button notif-button" type="button" aria-label="Open notifications">
                🔔
                <span id="notifications-badge" class="notif-badge is-hidden">0</span>
              </button>
              <button id="settings-toggle" class="icon-button" type="button" aria-label="Open settings">⚙️</button>
            </div>
          </div>
          <div id="notifications-panel" class="notifications-panel is-hidden">
            <h3 class="notifications-title">RPG Updates</h3>
            <ul id="notifications-list" class="notifications-list"></ul>
          </div>

          <div id="settings-panel" class="settings-panel is-hidden">
            <div class="options-row">
              <label class="toggle-label" for="notifications-enabled">
                <input id="notifications-enabled" type="checkbox" ${notificationsEnabled ? "checked" : ""} />
                Notificações RPG
              </label>
            </div>
            <div id="room-name-row" class="options-row">
              <input id="room-name-input" class="rpg-name" maxlength="64" />
              <button id="room-name-save" class="rpg-button" type="button">Salvar Nome</button>
            </div>
            <div class="profile-row">
              <input id="profile-name" class="rpg-name" value="${profile.name}" maxlength="24" />
              <select id="profile-avatar" class="rpg-select">
                ${buildSelectOptions(avatarOptions, profile.avatar)}
              </select>
              <select id="profile-mood" class="rpg-select">
                ${buildSelectOptions(moodOptions, profile.mood)}
              </select>
              <button id="profile-apply" class="rpg-button" type="button">Apply</button>
            </div>
          </div>

          <div id="chat-feed" class="chat-feed"></div>
          <form id="message-form" class="chat-composer">
            <input
              id="message-input"
              class="rpg-input"
              name="message"
              type="text"
              placeholder="Digite sua mensagem..."
              required
              maxlength="500"
            />
            <div class="rpg-actions">
              <button class="rpg-button icon-only" type="submit" title="Enviar" aria-label="Enviar">➤</button>
              <button class="rpg-button icon-only" id="image-button" type="button" title="Image" aria-label="Image">📷</button>
              <button class="rpg-button icon-only" id="dice-button" type="button" title="Dice" aria-label="Dice">🎲</button>
              <button class="rpg-button icon-only" id="challenge-button" type="button" title="Challenge" aria-label="Challenge">🎯</button>
            </div>
          </form>
        </section>
      </section>
    </main>
  `;

  const playersPanel = container.querySelector("#players-panel");
  const chatFeed = container.querySelector("#chat-feed");
  const roomTitle = container.querySelector("#room-title");
  const notificationsToggle = container.querySelector("#notifications-toggle");
  const notificationsPanel = container.querySelector("#notifications-panel");
  const notificationsList = container.querySelector("#notifications-list");
  const notificationsBadge = container.querySelector("#notifications-badge");
  const settingsToggle = container.querySelector("#settings-toggle");
  const settingsPanel = container.querySelector("#settings-panel");
  const notificationsEnabledInput = container.querySelector("#notifications-enabled");
  const roomNameRow = container.querySelector("#room-name-row");
  const roomNameInput = container.querySelector("#room-name-input");
  const roomNameSave = container.querySelector("#room-name-save");
  const profileName = container.querySelector("#profile-name");
  const profileAvatar = container.querySelector("#profile-avatar");
  const profileMood = container.querySelector("#profile-mood");
  const profileApply = container.querySelector("#profile-apply");
  const form = container.querySelector("#message-form");
  const input = container.querySelector("#message-input");
  const imageButton = container.querySelector("#image-button");
  const diceButton = container.querySelector("#dice-button");
  const challengeButton = container.querySelector("#challenge-button");

  if (
    !(playersPanel instanceof HTMLElement) ||
    !(chatFeed instanceof HTMLElement) ||
    !(roomTitle instanceof HTMLElement) ||
    !(notificationsToggle instanceof HTMLButtonElement) ||
    !(notificationsPanel instanceof HTMLElement) ||
    !(notificationsList instanceof HTMLElement) ||
    !(notificationsBadge instanceof HTMLElement) ||
    !(settingsToggle instanceof HTMLButtonElement) ||
    !(settingsPanel instanceof HTMLElement) ||
    !(notificationsEnabledInput instanceof HTMLInputElement) ||
    !(roomNameRow instanceof HTMLElement) ||
    !(roomNameInput instanceof HTMLInputElement) ||
    !(roomNameSave instanceof HTMLButtonElement) ||
    !(profileName instanceof HTMLInputElement) ||
    !(profileAvatar instanceof HTMLSelectElement) ||
    !(profileMood instanceof HTMLSelectElement) ||
    !(profileApply instanceof HTMLButtonElement) ||
    !(form instanceof HTMLFormElement) ||
    !(input instanceof HTMLInputElement) ||
    !(imageButton instanceof HTMLButtonElement) ||
    !(diceButton instanceof HTMLButtonElement) ||
    !(challengeButton instanceof HTMLButtonElement)
  ) {
    return;
  }

  function renderRoomName() {
    roomTitle.textContent = state.roomName;
    roomNameInput.value = state.roomName;
    roomNameRow.style.display = state.creatorUserId === profile.userId ? "grid" : "none";
  }

  function renderNotificationsCenter() {
    const hasUnread = state.unreadNotifications > 0;
    notificationsBadge.textContent = String(state.unreadNotifications);
    notificationsBadge.classList.toggle("is-hidden", !hasUnread);
    notificationsList.innerHTML = state.notifications
      .map((item) => `<li class="notification-item">${item}</li>`)
      .join("");
  }

  function pushNotification(text) {
    if (!notificationsEnabled) {
      return;
    }

    state.notifications.unshift(text);
    state.notifications = state.notifications.slice(0, 30);
    if (notificationsPanel.classList.contains("is-hidden")) {
      state.unreadNotifications += 1;
    }
    renderNotificationsCenter();
  }

  function renderPlayers() {
    const players = [...state.players.values()];
    renderPlayerPanel(playersPanel, players);
  }

  function handleSocketMessage(rawData) {
    let eventData;
    try {
      eventData = JSON.parse(rawData);
    } catch {
      return;
    }

    if (eventData.type === "room_state") {
      state.players = new Map(eventData.players.map((player) => [player.id, player]));
      state.maxPlayers = eventData.maxPlayers ?? state.maxPlayers;
      renderPlayers();
      return;
    }

    if (eventData.type === "history") {
      renderHistory(chatFeed, eventData.messages);
      return;
    }

    if (eventData.type === "user_join") {
      state.players.set(eventData.player.id, eventData.player);
      state.maxPlayers = eventData.maxPlayers ?? state.maxPlayers;
      renderPlayers();
      pushNotification(`🛡️ ${eventData.player.avatar} ${eventData.player.name} joined`);
      return;
    }

    if (eventData.type === "user_message") {
      if (eventData.messageType !== "system") {
        appendUserMessage(chatFeed, eventData);
      }
      return;
    }

    if (eventData.type === "user_xp_gain") {
      const player = state.players.get(eventData.userId);
      if (player) {
        player.xp = eventData.xp;
        player.level = eventData.level;
        state.players.set(player.id, player);
        renderPlayers();
      }
      pushNotification(`✨ +${eventData.xpGain} XP`);
      return;
    }

    if (eventData.type === "level_up") {
      pushNotification(`🆙 ${eventData.name} reached Level ${eventData.level}`);
      return;
    }

    if (eventData.type === "achievement_unlocked") {
      pushNotification(`🏆 ${eventData.achievement}`);
      return;
    }

    if (eventData.type === "connection_level_up") {
      pushNotification(`🔥 Connection ${eventData.level} ${eventData.hearts}`);
    }
  }

  function connect() {
    connection?.disconnect();
    connection = connectRoomSocket(roomId, profile, {
      onMessage: handleSocketMessage,
      onClose: () => {
        pushNotification("⚠️ Disconnected");
      }
    });
  }

  notificationsToggle.addEventListener("click", () => {
    const willOpen = notificationsPanel.classList.contains("is-hidden");
    notificationsPanel.classList.toggle("is-hidden");
    if (willOpen) {
      state.unreadNotifications = 0;
      renderNotificationsCenter();
    }
  });
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }

    if (
      notificationsPanel.classList.contains("is-hidden") ||
      notificationsPanel.contains(target) ||
      notificationsToggle.contains(target)
    ) {
      return;
    }

    notificationsPanel.classList.add("is-hidden");
  });

  settingsToggle.addEventListener("click", () => {
    settingsPanel.classList.toggle("is-hidden");
  });

  notificationsEnabledInput.addEventListener("change", () => {
    notificationsEnabled = notificationsEnabledInput.checked;
    saveNotificationsEnabled(notificationsEnabled);
    if (!notificationsEnabled) {
      state.notifications = [];
      state.unreadNotifications = 0;
      renderNotificationsCenter();
    }
  });

  roomNameSave.addEventListener("click", async () => {
    if (state.creatorUserId !== profile.userId) {
      return;
    }

    const nextRoomName = roomNameInput.value.trim();
    if (!nextRoomName) {
      pushNotification("⚠️ O nome da sala não pode ficar vazio");
      return;
    }

    try {
      const result = await updateRoomName(roomId, {
        requesterUserId: profile.userId,
        roomName: nextRoomName
      });
      state.roomName = result.roomName;
      renderRoomName();
      pushNotification("🛠️ Nome da sala atualizado");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao atualizar nome da sala";
      pushNotification(`⚠️ ${message}`);
    }
  });

  profileApply.addEventListener("click", () => {
    profile = {
      userId: profile.userId,
      name: profileName.value.trim() || "Adventurer",
      avatar: profileAvatar.value,
      mood: profileMood.value
    };
    saveProfile(profile);
    pushNotification(`🧾 ${profile.avatar} ${profile.name} • ${profile.mood}`);
    connect();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const content = input.value.trim();
    if (!content) {
      return;
    }

    connection?.sendEvent({ type: "user_message", content });
    input.value = "";
  });

  imageButton.addEventListener("click", () => {
    const imageText = window.prompt("Paste an image URL or short description:");
    if (!imageText) {
      return;
    }

    connection?.sendEvent({ type: "user_image", content: normalizeImageInput(imageText) });
  });

  diceButton.addEventListener("click", () => {
    connection?.sendEvent({ type: "mini_action", action: "dice" });
  });

  challengeButton.addEventListener("click", () => {
    connection?.sendEvent({ type: "mini_action", action: "challenge" });
  });

  connect();
  renderNotificationsCenter();
  getRoom(roomId)
    .then((room) => {
      state.roomName = room.roomName || DEFAULT_ROOM_NAME;
      state.creatorUserId = room.creatorUserId || "";
      state.maxPlayers = room.maxParticipants ?? state.maxPlayers;
      renderRoomName();
      renderPlayers();
    })
    .catch(() => {
      renderRoomName();
    });

  window.addEventListener(
    "beforeunload",
    () => {
      connection?.disconnect();
    },
    { once: true }
  );
}
