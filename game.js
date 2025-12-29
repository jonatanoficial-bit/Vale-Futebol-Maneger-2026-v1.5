(function () {
  const NS = (window.VFM26 = window.VFM26 || {});

  // -----------------------------
  // Estado do jogo (ponte)
  // -----------------------------
  const state = {
    version: "v1.5",
    engineVersion: "v1.2.0",
    packId: null,
    packData: null,
    packsCatalog: null,

    // saves
    saveSlots: [
      { id: 1, name: "Slot 1", data: null },
      { id: 2, name: "Slot 2", data: null }
    ],
    currentSlot: null,

    // carreira
    career: null
  };

  // -----------------------------
  // Util
  // -----------------------------
  function safeJsonParse(str) {
    try { return JSON.parse(str); } catch { return null; }
  }

  function storageKey(slotId) {
    return `VFM26_SAVE_SLOT_${slotId}`;
  }

  function loadSavesFromStorage() {
    state.saveSlots.forEach(s => {
      const raw = localStorage.getItem(storageKey(s.id));
      s.data = raw ? safeJsonParse(raw) : null;
    });
  }

  function saveSlotToStorage(slotId, data) {
    localStorage.setItem(storageKey(slotId), JSON.stringify(data));
    loadSavesFromStorage();
  }

  function deleteSlotFromStorage(slotId) {
    localStorage.removeItem(storageKey(slotId));
    loadSavesFromStorage();
  }

  function fmtMoney(n) {
    if (typeof n !== "number") return "—";
    return n.toLocaleString("pt-BR");
  }

  // -----------------------------
  // DataPack
  // -----------------------------
  async function fetchCatalog() {
    const url = "packs/catalog.json";
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao carregar ${url}: HTTP ${res.status}`);
    const json = await res.json();
    return json;
  }

  async function fetchPack(packFile) {
    const url = `packs/${packFile}`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao carregar ${url}: HTTP ${res.status}`);
    const json = await res.json();
    return json;
  }

  function setActivePack(packId, packData) {
    state.packId = packId;
    state.packData = packData;
    localStorage.setItem("VFM26_ACTIVE_PACK", packId);
  }

  function loadActivePackId() {
    return localStorage.getItem("VFM26_ACTIVE_PACK");
  }

  // -----------------------------
  // Clubs (com CREST real)
  // -----------------------------
  function getClubsFromPack() {
    const pack = state.packData;
    if (!pack) return [];

    const clubs = Array.isArray(pack.clubs) ? pack.clubs : [];
    return clubs
      .filter(c => c && c.id && c.name)
      .map(c => ({
        id: String(c.id),
        name: String(c.name),
        shortName: c.shortName ? String(c.shortName) : String(c.name),
        league: c.league ? String(c.league) : "unknown",
        state: c.state ? String(c.state) : "",
        rating: typeof c.rating === "number" ? c.rating : null,
        budget: typeof c.budget === "number" ? c.budget : null,

        // prioridade: o que vem do pack (campo crest)
        // fallback: pasta que EXISTE no seu ZIP: assets/logos/ID.png
        crest: c.crest ? String(c.crest) : `assets/logos/${String(c.id)}.png`
      }));
  }

  // -----------------------------
  // UI helpers (cards/botões)
  // -----------------------------
  function screenShell(title, subtitle, innerHtml) {
    return `
      <div class="screen">
        <div class="hdr">
          <h1 class="title">${title}</h1>
          <p class="sub">${subtitle || ""}</p>
        </div>
        <div class="body">${innerHtml}</div>
      </div>
    `;
  }

  function btn(label, cls, onclick) {
    return `<button class="btn ${cls}" onclick="${onclick}">${label}</button>`;
  }

  // -----------------------------
  // Fluxo: Cover → DataPack → SaveSlot → Carreira (fase 3)
  // -----------------------------
  function renderCover() {
    const html = screenShell(
      "Vale Futebol Manager 2026",
      "Simulador de futebol manager. Base sólida pronta. Agora: DataPack e Saves.",
      `
        <div class="card">
          <div style="font-weight:900; text-transform:uppercase;">Modo Carreira</div>
          <div class="sp"></div>
          <div style="color:var(--muted); line-height:1.35">
            Fluxo obrigatório: DataPack → Save Slot → Carreira.
          </div>
          <div class="sp"></div>
          <span class="badge">Engine ${state.engineVersion}</span>
        </div>
        <div class="sp"></div>
        <div class="row">
          ${btn("Iniciar", "btn-green", "VFM26.Game.goDataPack()")}
        </div>
      `
    );

    NS.UI.setHTML(html);
  }

  async function renderDataPack() {
    let catalog;
    try {
      catalog = await fetchCatalog();
      state.packsCatalog = catalog;
    } catch (e) {
      const html = screenShell(
        "Escolher DataPack",
        "Sem mexer no código do jogo: os packs são arquivos JSON em /packs.",
        `
          <div class="card">
            <div style="font-weight:900; color:var(--red)">Falha ao carregar catálogo</div>
            <div class="sp"></div>
            <div style="color:var(--muted)">${String(e.message || e)}</div>
          </div>
          <div class="sp"></div>
          <div class="row">
            ${btn("Voltar", "btn-gray", "VFM26.Game.goCover()")}
          </div>
        `
      );
      NS.UI.setHTML(html);
      return;
    }

    const packs = Array.isArray(catalog.packs) ? catalog.packs : [];
    if (!packs.length) {
      const html = screenShell(
        "Escolher DataPack",
        "Sem mexer no código do jogo: os packs são arquivos JSON em /packs.",
        `
          <div class="card">
            <div style="font-weight:900">Nenhum pack encontrado em packs/catalog.json</div>
            <div class="sp"></div>
            <div style="color:var(--muted)">Verifique se catalog.json tem o array <b>packs</b> com pelo menos 1 item.</div>
          </div>
          <div class="sp"></div>
          <div class="row">
            ${btn("Voltar", "btn-gray", "VFM26.Game.goCover()")}
          </div>
        `
      );
      NS.UI.setHTML(html);
      return;
    }

    const list = packs.map(p => {
      const region = p.region ? `Região: ${p.region}` : "";
      const desc = p.description ? p.description : "";
      return `
        <div class="card" style="margin-bottom:12px;">
          <div style="font-weight:900; text-transform:uppercase;">${p.name}</div>
          <div class="sp"></div>
          <div style="color:var(--muted); line-height:1.35">${desc}</div>
          <div class="sp"></div>
          <div style="color:var(--muted); font-size:12px;">ID: <b>${p.id}</b> ${region ? `| ${region}` : ""}</div>
          <div class="sp"></div>
          <div class="row">
            ${btn("Selecionar", "btn-green", `VFM26.Game.selectPack('${p.id}')`)}
          </div>
        </div>
      `;
    }).join("");

    const html = screenShell(
      "Escolher DataPack",
      "Escolha o pacote de dados. Ele define ligas, clubes e calendário.",
      `
        ${list}
        <div class="row">
          ${btn("Voltar", "btn-gray", "VFM26.Game.goCover()")}
        </div>
      `
    );
    NS.UI.setHTML(html);
  }

  async function selectPack(packId) {
    const packs = (state.packsCatalog && Array.isArray(state.packsCatalog.packs)) ? state.packsCatalog.packs : [];
    const p = packs.find(x => x.id === packId);
    if (!p) {
      alert("Pack não encontrado no catálogo.");
      return;
    }

    try {
      const packData = await fetchPack(p.file);
      setActivePack(packId, packData);
      NS.UI.setHTML(
        screenShell(
          "Próxima Etapa: Save Slot",
          `Pack selecionado: ${p.name}`,
          `
            <div class="card">
              <div style="font-weight:900">Pack ativo: <b>${packId}</b></div>
              <div class="sp"></div>
              <div style="color:var(--muted)">Agora escolha um slot para criar/continuar carreira.</div>
            </div>
            <div class="sp"></div>
            <div class="row">
              ${btn("Continuar", "btn-green", "VFM26.Game.goSaveSlot()")}
              ${btn("Voltar", "btn-gray", "VFM26.Game.goDataPack()")}
            </div>
          `
        )
      );
    } catch (e) {
      alert("Falha ao carregar pack: " + (e.message || e));
    }
  }

  function renderSaveSlot() {
    loadSavesFromStorage();

    const packId = state.packId || loadActivePackId() || "—";
    const cards = state.saveSlots.map(s => {
      const isEmpty = !s.data;
      const title = `SLOT ${s.id} — ${isEmpty ? "Começar novo jogo" : "Continuar carreira"}`;
      const packInfo = `Pack atual: ${packId}`;
      return `
        <div class="card" style="margin-bottom:12px;">
          <div style="font-weight:900">${title}</div>
          <div class="sp"></div>
          <div style="color:var(--muted)">${isEmpty ? "Slot vazio." : "Slot com dados salvos."} ${packInfo}</div>
          <div class="sp"></div>
          <div class="row">
            ${btn(isEmpty ? "Criar novo" : "Continuar", "btn-green", `VFM26.Game.useSlot(${s.id})`)}
            ${btn("Apagar", "btn-red", `VFM26.Game.deleteSlot(${s.id})`)}
          </div>
        </div>
      `;
    }).join("");

    const html = screenShell(
      "Escolher Save Slot",
      `DataPack ativo: ${packId}`,
      `
        ${cards}
        <div class="row">
          ${btn("Voltar", "btn-gray", "VFM26.Game.goDataPack()")}
        </div>
      `
    );

    NS.UI.setHTML(html);
  }

  function useSlot(slotId) {
    loadSavesFromStorage();
    const slot = state.saveSlots.find(s => s.id === slotId);
    if (!slot) return;

    state.currentSlot = slotId;

    // se já existe carreira salva, carrega; senão cria etapa de carreira (fase 3)
    if (slot.data && slot.data.career) {
      state.career = slot.data.career;
      NS.UI.go("lobby"); // lobby-ui.js vai pegar state.career via VFM26.Game.getCareer()
    } else {
      renderCareerCreate();
    }
  }

  function deleteSlot(slotId) {
    if (!confirm(`Apagar Slot ${slotId}?`)) return;
    deleteSlotFromStorage(slotId);
    renderSaveSlot();
  }

  // -----------------------------
  // FASE 3: Criar carreira (nome/avatar/país/cargo/clube)
  // -----------------------------
  function renderCareerCreate() {
    const clubs = getClubsFromPack();
    const options = clubs.map(c => {
      const label = `${c.name} (${c.league}${c.state ? " - " + c.state : ""})`;
      return `<option value="${c.id}">${label}</option>`;
    }).join("");

    const html = screenShell(
      "Criar Carreira",
      "Preencha perfil, escolha cargo e selecione um clube do Brasil (fase inicial).",
      `
        <div class="card">
          <div style="font-weight:900; margin-bottom:8px;">Perfil</div>
          <div style="display:grid; gap:10px;">
            <input id="c_name" placeholder="Seu nome" style="padding:12px;border-radius:12px;border:1px solid var(--stroke2);background:rgba(0,0,0,.25);color:var(--text);" />
            <input id="c_country" placeholder="País (ex: Brasil)" style="padding:12px;border-radius:12px;border:1px solid var(--stroke2);background:rgba(0,0,0,.25);color:var(--text);" />
            <select id="c_role" style="padding:12px;border-radius:12px;border:1px solid var(--stroke2);background:rgba(0,0,0,.25);color:var(--text);">
              <option value="coach">Treinador</option>
              <option value="sporting">Diretor Esportivo</option>
              <option value="president">Presidente</option>
            </select>

            <div style="height:6px;"></div>

            <div style="font-weight:900; margin-bottom:6px;">Clube</div>
            <select id="c_club" style="padding:12px;border-radius:12px;border:1px solid var(--stroke2);background:rgba(0,0,0,.25);color:var(--text);">
              ${options || `<option value="">(Sem clubes no pack)</option>`}
            </select>
          </div>
        </div>

        <div class="sp"></div>

        <div class="row">
          ${btn("Criar", "btn-green", "VFM26.Game.createCareerFromForm()")}
          ${btn("Voltar", "btn-gray", "VFM26.Game.goSaveSlot()")}
        </div>
      `
    );

    NS.UI.setHTML(html);
  }

  function createCareerFromForm() {
    const name = (document.getElementById("c_name")?.value || "").trim();
    const country = (document.getElementById("c_country")?.value || "").trim();
    const role = (document.getElementById("c_role")?.value || "coach").trim();
    const clubId = (document.getElementById("c_club")?.value || "").trim();

    if (!name || !country || !clubId) {
      alert("Preencha nome, país e selecione um clube.");
      return;
    }

    const clubs = getClubsFromPack();
    const club = clubs.find(c => c.id === clubId);
    if (!club) {
      alert("Clube inválido.");
      return;
    }

    state.career = {
      createdAt: Date.now(),
      profile: { name, country },
      role,
      club,
      points: 0
    };

    // salva no slot
    const data = { packId: state.packId, career: state.career };
    saveSlotToStorage(state.currentSlot, data);

    // tutorial/boas vindas (simples por enquanto)
    NS.UI.setHTML(
      screenShell(
        "Bem-vindo!",
        "Você iniciou sua carreira. Próximo passo: Lobby.",
        `
          <div class="card">
            <div style="font-weight:900">Olá, <b>${name}</b>!</div>
            <div class="sp"></div>
            <div style="color:var(--muted); line-height:1.35">
              Cargo: <b>${role}</b><br/>
              Clube: <b>${club.name}</b>
            </div>
            <div class="sp"></div>
            <div class="row">
              ${btn("Ir para o Lobby", "btn-green", "VFM26.UI.go('lobby')")}
            </div>
          </div>
        `
      )
    );
  }

  // -----------------------------
  // Navegação
  // -----------------------------
  function goCover() { NS.UI.go('cover'); }
  function goDataPack() { NS.UI.go('datapack'); }
  function goSaveSlot() { NS.UI.go('saveslot'); }

  // -----------------------------
  // Exposição pública
  // -----------------------------
  NS.Game = {
    state,

    // getters
    getCareer: () => state.career,
    getPack: () => state.packData,
    getClubsFromPack,

    // flow
    goCover,
    goDataPack,
    goSaveSlot,

    // actions
    selectPack,
    useSlot,
    deleteSlot,
    createCareerFromForm,

    // render hooks chamados pelo UI
    renderCover,
    renderDataPack,
    renderSaveSlot,
    renderCareerCreate
  };
})();