(function () {
  const bust = Date.now();

  // A UI do projeto pode estar em /ui (novo) ou /Ui (antigo).
  const BASES = ["./ui", "./Ui"];

  const REQUIRED = [
    "ui.js",
    "debug-panel-ui.js",
    "lobby-hub-ui.js",
    "team-ui.js",
    "tactics-ui.js",
    "calendar-ui.js",
    "market-ui.js",
    "match-center-ui.js",
    "post-match-ui.js",
    "season-calendar-ui.js",
    "transfer-market-ui.js",
    "training-ui.js",
    "competitions-ui.js",
    "contracts-ui.js"
  ];

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src + (src.includes("?") ? "&" : "?") + "v=" + bust;
      s.onload = () => resolve(src);
      s.onerror = () => reject(new Error("Falhou: " + src));
      document.head.appendChild(s);
    });
  }

  async function tryBase(base) {
    // Carrega primeiro ui.js (geralmente registra helpers)
    await loadScript(base + "/ui.js");

    // Carrega os demais módulos (se algum não existir, acusamos com clareza)
    for (const f of REQUIRED) {
      if (f === "ui.js") continue;
      await loadScript(base + "/" + f);
    }

    return base;
  }

  async function bootstrap() {
    let chosen = null;
    let errors = [];

    for (const base of BASES) {
      try {
        chosen = await tryBase(base);
        break;
      } catch (e) {
        errors.push(String(e && e.message ? e.message : e));
      }
    }

    if (!chosen) {
      alert(
        "Não consegui carregar a UI real.\n\n" +
        "Bases testadas:\n- " + BASES.join("\n- ") + "\n\n" +
        "Erros:\n- " + errors.join("\n- ") + "\n\n" +
        "Causa mais comum: pasta Ui/ apagada ou caminho errado.\n" +
        "Solução rápida: recrie Ui/ copiando o conteúdo de ui/."
      );
      return;
    }

    window.__UI_BASE = chosen;

    // Start do app
    if (typeof window.main === "function") {
      window.main();
    } else if (typeof window.Game !== "undefined" && typeof window.Game.init === "function") {
      window.Game.init();
    } else if (typeof window.startGame === "function") {
      window.startGame();
    } else {
      // Último fallback: mostra algo na tela + botão debug funcionando
      const app = document.getElementById("app");
      if (app) {
        app.innerHTML =
          '<div style="color:#fff;font-family:sans-serif;padding:16px">' +
          "<h2>UI carregou, mas não encontrei main()/Game.init()/startGame().</h2>" +
          "<p>Isso indica que o ponto de entrada mudou. Verifique main.js/game.js.</p>" +
          "</div>";
      }
    }
  }

  // Função chamada pelo index.html
  window.__startApp = bootstrap;

})();