function createMessageNode(label, className = "") {
  const item = document.createElement("article");
  item.className = `chat-item ${className}`.trim();

  const labelNode = document.createElement("p");
  labelNode.className = "chat-label";
  labelNode.textContent = label;

  const contentNode = document.createElement("div");
  contentNode.className = "chat-content";

  item.appendChild(labelNode);
  item.appendChild(contentNode);
  return { item, contentNode };
}

function createEventNode(icon, title, detail, className = "") {
  const item = document.createElement("article");
  item.className = `event-badge ${className}`.trim();
  item.innerHTML = `
    <p class="event-title">${icon} ${title}</p>
    <p class="event-detail">${detail}</p>
  `;
  return item;
}

export function appendUserMessage(container, message) {
  const label = `${message.avatar ?? "🧙"} ${message.userName ?? "Player"} (${message.mood ?? ""})`;
  const { item, contentNode } = createMessageNode(label, "chat-user");

  if (message.messageType === "image") {
    const image = document.createElement("img");
    image.src = message.content;
    image.alt = "Shared image";
    image.loading = "lazy";
    image.className = "chat-image";
    image.addEventListener("error", () => {
      image.remove();
    });

    const link = document.createElement("a");
    link.href = message.content;
    link.target = "_blank";
    link.rel = "noreferrer noopener";
    link.textContent = "Open image";
    link.className = "chat-image-link";

    contentNode.appendChild(image);
    contentNode.appendChild(link);
  } else {
    const text = document.createElement("p");
    text.textContent = message.content;
    text.className = "chat-text";
    contentNode.appendChild(text);
  }

  container.appendChild(item);
  container.scrollTop = container.scrollHeight;
}

export function appendSystemMessage(container, content) {
  const { item, contentNode } = createMessageNode("System", "chat-system");
  const text = document.createElement("p");
  text.textContent = content;
  text.className = "chat-text";
  contentNode.appendChild(text);
  container.appendChild(item);
  container.scrollTop = container.scrollHeight;
}

export function appendEventBadge(container, event) {
  const item = createEventNode(event.icon, event.title, event.detail, event.className ?? "");
  container.appendChild(item);
  container.scrollTop = container.scrollHeight;
}

export function renderHistory(container, messages) {
  container.innerHTML = "";
  messages.forEach((message) => {
    if (message.messageType === "system") {
      return;
    }

    appendUserMessage(container, message);
  });
}
