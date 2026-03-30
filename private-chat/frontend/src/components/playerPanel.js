function renderPlayerRow(player) {
  const statusClass = player.online ? "status-online" : "status-offline";
  const statusText = player.online ? "Online" : "Offline";

  return `
    <li class="player-item">
      <span class="player-name">${player.name}</span>
      <span class="status-dot ${statusClass}" title="${statusText}" aria-label="${statusText}"></span>
    </li>
  `;
}

export function renderPlayerPanel(container, players) {
  const sorted = [...players].sort((a, b) => {
    if (a.online !== b.online) {
      return a.online ? -1 : 1;
    }

    return a.name.localeCompare(b.name);
  });

  container.innerHTML = `
    <section class="rpg-panel player-panel-compact">
      <h2 class="players-title">Players</h2>
      <ul class="players-list">
        ${sorted.map((player) => renderPlayerRow(player)).join("")}
      </ul>
    </section>
  `;
}
