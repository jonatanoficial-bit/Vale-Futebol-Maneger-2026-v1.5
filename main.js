/* main.js — bootstrap seguro (não quebra se algum botão não existir)
   Regras:
   - Nunca setar .onclick em null
   - Nunca depender de função global inexistente (ex: n())
   - Ficar resiliente a telas/IDs que ainda não existem
*/

(function () {
  "use strict";

  // Helpers
  const $ = (id) => document.getElementById(id);

  function bindClick(id, handler) {
    const el = $(id);
    if (!el) return false;
    el.onclick = handler;
    return true;
  }

  function safeNumber(v, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function showScreen(screenId) {
    const all = document.querySelectorAll("[data-screen]");
    all.forEach((el) => (el.style.display = "none"));

    const target = $(screenId);
    if (target) target.style.display = "block";
  }

  // Exemplo: caso seu UI tenha telas/containers
  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = String(text);
  }

  // --- Fluxo mínimo: só não quebrar o carregamento ---
  async function init() {
    // Se você tiver algo como window.GameEngine, window.UI, etc,
    // aqui é o lugar para validar sem quebrar a página:
    // (não lançamos erro se não existir, só logamos)
    const hasGame = !!window.Game;
    const hasUI = !!window.UI;

    // Opcional: debug no console
    // console.log("[BOOT] hasGame:", hasGame, "hasUI:", hasUI);

    configurarBotoesBasicos();
    carregarLobbyAAA(); // se existir DOM, preenche; se não, não quebra
  }

  function configurarBotoesBasicos() {
    // Esses IDs só serão bindados se existirem.
    // Isso elimina o erro: Cannot set properties of null (setting 'onclick')

    bindClick("btn-iniciar", () => {
      // comportamento: se existir uma função global de navegação, use.
      if (typeof window.__startApp === "function") {
        window.__startApp();
        return;
      }
      // fallback: tenta mostrar uma tela conhecida
      showScreen("screen-pacote-dados");
    });

    bindClick("btn-continuar", () => {
      showScreen("screen-slots");
    });

    bindClick("btn-config", () => {
      showScreen("screen-config");
    });

    bindClick("btn-voltar", () => {
      showScreen("screen-capa");
    });
  }

  function carregarLobbyAAA() {
    // Preenchimento seguro: só faz se os elementos existirem
    const user = window.__SAVE__?.user || window.__SAVE__?.perfil || null;
    if (!user) return;

    // Exemplos (ajuste conforme seu HTML real):
    setText("lobby-nome", user.nome || "—");
    setText("lobby-pais", user.pais || "—");

    const club = window.__SAVE__?.club || window.__SAVE__?.clube || null;
    if (club) {
      setText("lobby-clube", club.nome || "—");
      const bal = safeNumber(club.saldo, 0);
      setText("lobby-saldo", bal.toLocaleString("pt-BR"));
    }
  }

  // Boot
  document.addEventListener("DOMContentLoaded", () => {
    init().catch((err) => {
      console.error(err);
      alert("Erro crítico: Game ou UI não carregaram.");
    });
  });
})();