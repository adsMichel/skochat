import { renderCreateRoomPage } from "./pages/createRoomPage.js";

const app = document.querySelector("#app");

if (app instanceof HTMLElement) {
  renderCreateRoomPage(app);
}
