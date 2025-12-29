// /game.js
// Interface entre Engine e UI (UI virá nas próximas fases)

export function start(Engine) {
  if (!Engine || Engine.isReady !== true) {
    throw new Error("Engine não está pronta (Engine.isReady !== true).");
  }

  const app = document.getElementById("app");
  if (!app) throw new Error("Elemento #app não encontrado no game.start().");

  Engine.log("Game start OK");

  app.innerHTML = `
    <div style="text-align:center; padding:18px; max-width:520px;">
      <div style="font-size:22px; font-weight:800; color:#00ff7f; margin-bottom:10px;">
        VFM26
      </div>
      <div style="opacity:0.9; font-size:14px; line-height:1.4;">
        Boot concluído com sucesso.<br>
        Próxima fase: DataPack Brasil + 2 Slots de Save.
      </div>

      <div style="margin-top:14px; font-size:12px; opacity:0.75;">
        Engine v${Engine.version}
      </div>
    </div>
  `;
}
