import { renderCreateRoomPage } from "./pages/createRoomPage.js";
import { renderRoomPage } from "./pages/roomPage.js";

function getRoomIdFromPath(pathname) {
  const match = pathname.match(/^\/room\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

const app = document.querySelector("#app");

if (app instanceof HTMLElement) {
  const roomId = getRoomIdFromPath(window.location.pathname);

  if (roomId) {
    renderRoomPage(app, roomId);
  } else {
    renderCreateRoomPage(app);
  }
}
