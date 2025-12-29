/* ui/ui.js - UI Root + Router (compatível com init() e start())
   IMPORTANTE: start() é alias de init() para compatibilidade com boots antigos.
*/
(function () {
  const NS = (window.VFM26 = window.VFM26 || {});
  const UI = (NS.UI = NS.UI || {});

  // --------- Helpers ----------
  function $(sel) {
    return document.querySelector(sel);
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function ensureRoot() {
    let root = $("#app");
    if (!root) {
      root = document.createElement("div");
      root.id = "app";
      document.body.appendChild(root);
    }
    return root;
  }

  function setView(html) {
    const root = ensureRoot();
    root.innerHTML = html;
  }

  // --------- State ----------
  UI._engine = null;
  UI._mounted = false;

  // --------- Screens (mantém o estilo atual do seu projeto) ----------
  function renderHome() {
    const engineVersion = escapeHtml(NS.VERSION || "v?");
    setView(`
      <div class="screen">
        <div class="panel">
          <h1 class="title">VALE FUTEBOL MANAGER 2026</h1>
          <p class="subtitle">Simulador de futebol manager. Base sólida pronta. Agora: DataPack e Saves.</p>

          <div class="card">
            <h2>MODO CARREIRA</h2>
            <p>Fluxo obrigatório: DataPack → Save Slot → Carreira.</p>
            <span class="badge">Engine ${engineVersion}</span>
          </div>

          <button class="btn btn-primary" id="btnStart">INICIAR</button>
        </div>
      </div>
    `);

    $("#btnStart").onclick = () => UI.go("datapack");
  }

  async function renderDataPack() {
    const engine = UI._engine;
    const catalog = engine?.state?.packCatalog;
    const packs = Array.isArray(catalog?.packs) ? catalog.packs : [];

    const listHtml = packs
      .map((p) => {
        const id = escapeHtml(p.id);
        const name = escapeHtml(p.name);
        const desc = escapeHtml(p.description || "");
        const active = String(engine.state.activePackId) === String(p.id);

        return `
          <div class="card">
            <h2>${name}</h2>
            <p>${desc}</p>
            <p class="small">ID: <b>${id}</b></p>
            <button class="btn btn-primary" data-pack="${id}">
              ${active ? "SELECIONADO" : "SELECIONAR"}
            </button>
          </div>
        `;
      })
      .join("");

    setView(`
      <div class="screen">
        <div class="panel">
          <h1 class="title">Escolher DataPack</h1>
          <p class="subtitle">Sem mexer no código do jogo: os packs são arquivos JSON em /packs.</p>
          ${listHtml || `<div class="card"><p>Nenhum pack encontrado em packs/catalog.json</p></div>`}
          <button class="btn" id="btnBack">VOLTAR</button>
        </div>
      </div>
    `);

    $("#btnBack").onclick = () => UI.go("home");

    document.querySelectorAll("[data-pack]").forEach((btn) => {
      btn.onclick = async () => {
        const id = btn.getAttribute("data-pack");
        try {
          await engine.setActivePack(id);
          UI.go("saves");
        } catch (e) {
          alert(`Falha ao carregar pack ${id}: ${e.message}`);
        }
      };
    });
  }

  function renderSaves() {
    const engine = UI._engine;
    const s1 = engine.state.slots["1"];
    const s2 = engine.state.slots["2"];

    function slotCard(slotId, slotData) {
      const isEmpty = !slotData;
      const packId = escapeHtml(slotData?.packId || engine.state.activePackId || "");
      return `
        <div class="card">
          <h2>SLOT ${slotId} — ${isEmpty ? "Começar novo jogo" : "Continuar carreira"}</h2>
          <p class="small">${isEmpty ? "Slot vazio." : "Slot com progresso."} Pack atual: <b>${packId}</b></p>
          <div class="row">
            <button class="btn btn-primary" data-create="${slotId}">
              ${isEmpty ? "CRIAR NOVO" : "CONTINUAR"}
            </button>
            <button class="btn btn-danger" data-del="${slotId}">APAGAR</button>
          </div>
        </div>
      `;
    }

    setView(`
      <div class="screen">
        <div class="panel">
          <h1 class="title">Escolher Save Slot</h1>
          <p class="subtitle">DataPack ativo: <b>${escapeHtml(engine.state.activePackId || "-")}</b></p>
          ${slotCard("1", s1)}
          ${slotCard("2", s2)}
          <button class="btn" id="btnBack">VOLTAR</button>
        </div>
      </div>
    `);

    $("#btnBack").onclick = () => UI.go("datapack");

    document.querySelectorAll("[data-create]").forEach((btn) => {
      btn.onclick = () => {
        const slotId = btn.getAttribute("data-create");
        // cria slot vazio amarrado ao pack atual
        const existing = engine.loadSlot(slotId);
        if (!existing) {
          engine.saveSlot(slotId, {
            packId: engine.state.activePackId,
            career: null,
          });
        }
        // segue para carreira
        UI.go("career", { slotId });
      };
    });

    document.querySelectorAll("[data-del]").forEach((btn) => {
      btn.onclick = () => {
        const slotId = btn.getAttribute("data-del");
        const ok = confirm(`Apagar SLOT ${slotId}?`);
        if (!ok) return;
        engine.deleteSlot(slotId);
        UI.go("saves");
      };
    });
  }

  function renderCareer(params) {
    // Sua career-ui.js já existe e pode ser plugada aqui depois.
    const slotId = params?.slotId || "1";
    const packId = escapeHtml(UI._engine.state.activePackId || "-");
    setView(`
      <div class="screen">
        <div class="panel">
          <h1 class="title">Próxima Etapa: Carreira</h1>
          <p class="subtitle">Slot ${escapeHtml(slotId)} selecionado. Agora entra a criação de carreira (nome, avatar, país, cargo, clube).</p>

          <div class="card">
            <h2>FASE 3 vai começar aqui</h2>
            <p>Vamos montar o fluxo completo: Criar perfil (nome/país/avatar) → Escolher cargo → Escolher clube do Brasil → Tutorial de boas-vindas → Lobby</p>
            <span class="badge">Pack: ${packId} | Slot: ${escapeHtml(slotId)}</span>
          </div>

          <div class="row">
            <button class="btn" id="btnBack">VOLTAR</button>
            <button class="btn btn-primary" id="btnContinue">CONTINUAR</button>
          </div>
        </div>
      </div>
    `);

    $("#btnBack").onclick = () => UI.go("saves");
    $("#btnContinue").onclick = () => {
      alert("Fase 3: Próximo passo é implementar o formulário completo de carreira + escolha de clube com escudo.");
    };
  }

  // --------- Router ----------
  UI.go = function (route, params) {
    UI._route = route || "home";
    UI._params = params || {};

    if (UI._route === "home") return renderHome();
    if (UI._route === "datapack") return renderDataPack();
    if (UI._route === "saves") return renderSaves();
    if (UI._route === "career") return renderCareer(UI._params);

    // fallback
    return renderHome();
  };

  // --------- Public API ----------
  UI.init = async function (engine) {
    UI._engine = engine || null;

    // monta 1x
    if (!UI._mounted) {
      UI._mounted = true;
    }

    // rota inicial
    UI.go("home");
    return true;
  };

  // ✅ Compatibilidade para boots que chamam NS.UI.start()
  UI.start = async function (engine) {
    return UI.init(engine);
  };
})();