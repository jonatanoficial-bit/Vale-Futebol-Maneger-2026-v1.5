// /game.js
// Interface entre Engine e UI (a UI é carregada depois da Engine)

export async function start(Engine) {
  if (!Engine || Engine.isReady !== true) {
    throw new Error("Engine não está pronta (Engine.isReady !== true).");
  }

  const app = document.getElementById("app");
  if (!app) throw new Error("Elemento #app não encontrado no game.start().");

  // Carrega UI depois da Engine (regra inviolável)
  const ui = await import("./ui/ui.js");
  if (!ui || typeof ui.mountUI !== "function") {
    throw new Error("UI inválida: ui/ui.js não exportou mountUI().");
  }

  ui.mountUI(Engine, app);
}