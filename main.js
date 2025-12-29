// /main.js (module)
// Regras do boot:
// - Nunca tela preta sem diagnóstico
// - Esperar DOM pronto
// - BootCheck -> Engine -> Game(UI)

function $(id) {
  return document.getElementById(id);
}

function setStatus(text) {
  const el = $("bootStatus");
  if (el) el.textContent = text;
}

function renderFatal(code, err) {
  console.error(code, err);
  const app = $("app");
  const msg = (err && err.message) ? err.message : "Erro desconhecido";
  const stack = (err && err.stack) ? String(err.stack) : "";

  if (app) {
    app.innerHTML = `
      <div class="boot-screen">
        <div class="boot-box">
          <div class="boot-title">Erro de Inicialização</div>
          <div class="boot-error">${code}</div>
          <div class="boot-status">${escapeHtml(msg)}</div>
          <div class="boot-mini">Debug: abra o console e procure <b>BOOT_STEPS</b>.</div>
          <div class="boot-mini">${escapeHtml(stack).slice(0, 1200)}</div>
        </div>
      </div>
    `;
  } else {
    alert(`${code}\n${msg}`);
  }
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function waitForDOM() {
  return new Promise((resolve) => {
    if (document.readyState === "interactive" || document.readyState === "complete") {
      resolve(true);
      return;
    }
    document.addEventListener("DOMContentLoaded", () => resolve(true), { once: true });
  });
}

async function boot() {
  // Log estruturado de passos (para debug do usuário)
  console.log("BOOT_STEPS: START");

  try {
    // 0) Garantir DOM pronto
    setStatus("Aguardando DOM...");
    await waitForDOM();

    if (!document.getElementById("app")) {
      throw new Error("Elemento #app não encontrado após DOMContentLoaded.");
    }

    // 1) BootCheck
    setStatus("Executando BootCheck...");
    console.log("BOOT_STEPS: importing boot-check");
    const bootCheck = await import("./engine/boot-check.js");

    console.log("BOOT_STEPS: runBootCheck");
    await bootCheck.runBootCheck();

    // 2) Engine
    setStatus("Carregando Engine...");
    console.log("BOOT_STEPS: importing engine/index");
    const engineModule = await import("./engine/index.js");

    if (!engineModule || !engineModule.Engine) {
      throw new Error("Engine inválida: engine/index.js não exportou Engine.");
    }

    // 3) Game
    setStatus("Iniciando jogo...");
    console.log("BOOT_STEPS: importing game.js");
    const game = await import("./game.js");

    if (!game || typeof game.start !== "function") {
      throw new Error("Game inválido: game.js não exportou start().");
    }

    console.log("BOOT_STEPS: starting game");
    game.start(engineModule.Engine);

    console.log("BOOT_STEPS: OK");
  } catch (err) {
    // Mapeamento de erros de boot
    const msg = (err && err.message) ? err.message : "";

    if (msg.includes("DOMContentLoaded") || msg.includes("#app")) {
      renderFatal("BOOT_E01_DOM_NOT_READY", err);
      return;
    }

    if (msg.includes("BootCheck")) {
      renderFatal("BOOT_E03_BOOTCHECK_FAIL", err);
      return;
    }

    renderFatal("BOOT_E02_RUNTIME_FAIL", err);
  }
}

// Disparar boot
boot();
