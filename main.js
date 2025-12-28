/* main.js
   Bootstrap único do jogo
   REGRA: aqui NÃO se toca em DOM, NÃO se usa onclick
*/

window.addEventListener("DOMContentLoaded", () => {
  if (!window.Game || !window.UI) {
    alert("Erro crítico: Game ou UI não carregaram.");
    return;
  }

  try {
    Game.init();
    UI.setEngine(Game, Game.getState, Game.actions);
    UI.boot();
  } catch (e) {
    console.error("Erro ao iniciar o jogo:", e);
    alert("Erro ao iniciar o jogo. Veja o console.");
  }
});