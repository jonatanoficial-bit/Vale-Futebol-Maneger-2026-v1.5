// main.js
(() => {
  "use strict";

  function $(id){ return document.getElementById(id); }

  function fatal(msg){
    alert(msg);
    console.error(msg);
  }

  function safeBindClick(id, fn){
    const el = $(id);
    if (!el) {
      console.warn(`[UI] Elemento não encontrado: #${id}`);
      return;
    }
    el.onclick = fn;
  }

  window.addEventListener("error", (ev) => {
    console.error("[window.error]", ev?.message || ev);
  });

  window.addEventListener("unhandledrejection", (ev) => {
    console.error("[unhandledrejection]", ev?.reason || ev);
  });

  window.addEventListener("DOMContentLoaded", () => {
    // 1) Valida base do HTML
    const app = $("app");
    if (!app) {
      fatal("Erro crítico: #app não existe no index.html (UI não pode iniciar).");
      return;
    }

    // 2) Valida Game/UI
    if (!window.Game || !window.UI) {
      fatal("Erro crítico: Game ou UI não carregaram.");
      return;
    }

    // 3) Inicializa
    try{
      window.Game.init();

      // Debug é opcional: se não existir, NÃO quebra o jogo
      safeBindClick("btnDebug", () => {
        const st = window.Game.getState?.();
        console.log("[DEBUG] state:", st);
        alert("DEBUG no console (F12).");
      });

    }catch(e){
      console.error(e);
      fatal("Erro crítico ao iniciar: " + (e?.message || e));
    }
  });

})();