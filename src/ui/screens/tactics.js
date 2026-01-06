import { FORMATIONS, getFormation, createDefaultLineup, validateLineup, computeTeamRating } from "../../domain/lineupModel.js";

function slotLabel(slotKey) {
  const map = {
    GK: "GOL",
    RB: "LD",
    LB: "LE",
    CB1: "ZAG",
    CB2: "ZAG",
    CB3: "ZAG",
    CDM1: "VOL",
    CDM2: "VOL",
    CM1: "MC",
    CM2: "MC",
    CM3: "MC",
    CAM: "MEI",
    RAM: "MEI D",
    LAM: "MEI E",
    RM: "ALA D",
    LM: "ALA E",
    RW: "PD",
    LW: "PE",
    ST: "ATA",
    ST1: "ATA",
    ST2: "ATA"
  };
  return map[slotKey] || slotKey;
}

function fallbackSvg() {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
      <rect width="100%" height="100%" rx="18" ry="18" fill="rgba(0,0,0,.35)"/>
      <circle cx="60" cy="48" r="20" fill="rgba(255,255,255,.20)"/>
      <rect x="26" y="74" width="68" height="30" rx="15" fill="rgba(255,255,255,.14)"/>
    </svg>
  `.trim();
}

export async function screenTactics({ shell, repos, store, navigate }) {
  const state = store.getState();
  if (!state.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!state.career?.clubId) { navigate("#/hub"); return { render() {} }; }

  const pack = await repos.loadPack(state.app.selectedPackId);
  const clubId = state.career.clubId;
  const clubs = pack.content.clubs.clubs;
  const club = clubs.find(c => c.id === clubId);

  const squad = pack.indexes.playersByClub.get(clubId) || [];
  const playersById = pack.indexes.playersById;

  // Carrega lineup do save ou cria um padrão
  const lineup = state.career?.lineup ? structuredClone(state.career.lineup) : createDefaultLineup();
  if (!lineup.formationId) lineup.formationId = "4-3-3";
  if (!lineup.starters) lineup.starters = {};
  if (!lineup.bench) lineup.bench = [];

  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div class="item__left" style="gap:12px">
          <img class="logo" src="${repos.resolveLogoSrc(club?.logoAssetId || clubId)}" alt="logo" onerror="this.style.opacity=.25" />
          <div>
            <div class="card__title">Tática & Escalação</div>
            <div class="card__subtitle">${club?.name || clubId} • ${squad.length} jogadores</div>
          </div>
        </div>
        <span class="badge" id="ratingBadge">OVR 0</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2">
          <div class="field" style="margin:0">
            <div class="label">Formação</div>
            <select class="select" id="formation">
              ${FORMATIONS.map(f => `<option value="${f.id}">${f.name}</option>`).join("")}
            </select>
          </div>
          <div class="field" style="margin:0">
            <div class="label">Ações</div>
            <div class="grid grid--2">
              <button class="btn" id="autoXI">Auto XI</button>
              <button class="btn btn--primary" id="save">Salvar</button>
            </div>
          </div>
        </div>

        <div style="height:12px"></div>

        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:900">Titulares (11)</div>
                <div class="muted" style="font-size:12px">Toque em um slot para escolher o jogador</div>
              </div>
              <span class="badge" id="statusBadge">Em edição</span>
            </div>

            <div style="height:12px"></div>
            <div class="grid grid--2" id="slots"></div>
          </div>
        </div>

        <div style="height:12px"></div>

        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div style="font-weight:900">Lista rápida</div>
            <div class="muted" style="font-size:12px;margin-top:6px;line-height:1.35">
              Esta tela prepara o motor de partida. Próximo passo: simular jogo, forma/moral, lesões e calendário.
            </div>
          </div>
        </div>

        <div style="height:12px"></div>
        <button class="btn" id="back">Voltar</button>
      </div>
    </div>
  `;

  const $formation = el.querySelector("#formation");
  const $slots = el.querySelector("#slots");
  const $ratingBadge = el.querySelector("#ratingBadge");
  const $statusBadge = el.querySelector("#statusBadge");

  $formation.value = lineup.formationId;

  function computeAndRenderBadges() {
    const rating = computeTeamRating({ formationId: lineup.formationId, starters: lineup.starters }, playersById);
    $ratingBadge.textContent = `OVR ${rating || 0}`;

    const v = validateLineup(lineup);
    $statusBadge.textContent = v.ok ? "OK" : "Incompleta";
    $statusBadge.className = "badge";
  }

  function renderSlots() {
    const formation = getFormation(lineup.formationId);
    $slots.innerHTML = "";
    for (const key of formation.slots) {
      const pid = lineup.starters[key];
      const p = pid ? playersById.get(pid) : null;

      const card = document.createElement("div");
      card.className = "item";
      card.style.borderRadius = "16px";
      card.innerHTML = `
        <div class="item__left" style="gap:10px">
          <span class="badge" style="min-width:54px;text-align:center">${slotLabel(key)}</span>
          <div>
            <div style="font-weight:900">${p ? p.name : "Selecionar jogador"}</div>
            <div class="muted" style="font-size:12px">${p ? `${(p.positions||[])[0] || "-"} • OVR ${p.overall}` : "Slot vazio"}</div>
          </div>
        </div>
        <button class="btn btn--primary" style="width:auto;padding:10px 12px">Escolher</button>
      `;

      card.querySelector("button").addEventListener("click", () => openPicker(key));
      $slots.appendChild(card);
    }
    computeAndRenderBadges();
  }

  function openPicker(slotKey) {
    // Modal simples sem dependências
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,.55)";
    overlay.style.backdropFilter = "blur(8px)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.padding = "16px";
    overlay.style.zIndex = "9999";

    const modal = document.createElement("div");
    modal.className = "card";
    modal.style.maxWidth = "520px";
    modal.style.width = "100%";
    modal.innerHTML = `
      <div class="card__header">
        <div>
          <div class="card__title">Escolher para ${slotLabel(slotKey)}</div>
          <div class="card__subtitle">Toque para selecionar</div>
        </div>
        <span class="badge">${squad.length}</span>
      </div>
      <div class="card__body">
        <div class="field" style="margin:0">
          <div class="label">Pesquisar</div>
          <input class="input" id="q" placeholder="Nome, posição, overall" />
        </div>
        <div style="height:12px"></div>
        <div class="list" id="list" style="max-height:52vh;overflow:auto"></div>
        <div style="height:12px"></div>
        <div class="grid grid--2">
          <button class="btn" id="clear">Limpar slot</button>
          <button class="btn btn--primary" id="close">Fechar</button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const $q = modal.querySelector("#q");
    const $list = modal.querySelector("#list");

    function isTaken(pid) {
      const keys = Object.keys(lineup.starters || {});
      for (const k of keys) if (lineup.starters[k] === pid) return true;
      return false;
    }

    function renderList(term) {
      $list.innerHTML = "";
      const t = (term || "").trim().toLowerCase();

      const candidates = squad
        .filter(p => {
          if (!t) return true;
          const hay = `${p.name} ${p.id} ${(p.positions||[]).join(" ")} ${p.overall}`.toLowerCase();
          return hay.includes(t);
        })
        .slice()
        .sort((a,b) => (b.overall - a.overall) || a.name.localeCompare(b.name, "pt-BR"));

      for (const p of candidates) {
        const taken = isTaken(p.id) && lineup.starters[slotKey] !== p.id;

        const item = document.createElement("div");
        item.className = "item";
        item.style.opacity = taken ? "0.45" : "1";
        item.innerHTML = `
          <div class="item__left" style="gap:10px">
            <img
              src="${repos.resolveFaceSrc(p.id)}"
              alt="face"
              style="width:42px;height:42px;border-radius:14px;border:1px solid rgba(255,255,255,.12);object-fit:cover;background:rgba(0,0,0,.22)"
              onerror="this.style.opacity=.25;this.src='data:image/svg+xml;utf8,${encodeURIComponent(fallbackSvg())}'"
            />
            <div>
              <div style="font-weight:900">${p.name}</div>
              <div class="muted" style="font-size:12px">${(p.positions||[])[0] || "-"} • OVR ${p.overall}</div>
            </div>
          </div>
          <button class="btn btn--primary" style="width:auto;padding:10px 12px" ${taken ? "disabled" : ""}>Selecionar</button>
        `;
        item.querySelector("button").addEventListener("click", () => {
          lineup.starters[slotKey] = p.id;
          document.body.removeChild(overlay);
          renderSlots();
        });
        $list.appendChild(item);
      }

      if (candidates.length === 0) {
        const empty = document.createElement("div");
        empty.className = "item";
        empty.innerHTML = `
          <div class="item__left">
            <div>
              <div style="font-weight:900">Nada encontrado</div>
              <div class="muted" style="font-size:12px">Ajuste a busca.</div>
            </div>
          </div>
          <span class="badge">0</span>
        `;
        $list.appendChild(empty);
      }
    }

    modal.querySelector("#close").addEventListener("click", () => {
      document.body.removeChild(overlay);
    });

    modal.querySelector("#clear").addEventListener("click", () => {
      delete lineup.starters[slotKey];
      document.body.removeChild(overlay);
      renderSlots();
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) document.body.removeChild(overlay);
    });

    $q.addEventListener("input", () => renderList($q.value));
    renderList("");
  }

  function autoPickXI() {
    const formation = getFormation(lineup.formationId);
    lineup.starters = {};

    // Ordena por overall e tenta montar um XI sem repetir
    const sorted = squad.slice().sort((a,b) => (b.overall - a.overall) || a.name.localeCompare(b.name,"pt-BR"));
    const used = new Set();

    function takeBy(predicate) {
      const p = sorted.find(x => !used.has(x.id) && predicate(x));
      if (p) { used.add(p.id); return p.id; }
      return null;
    }

    for (const slot of formation.slots) {
      const want =
        slot.startsWith("GK") ? ["GK"] :
        slot.startsWith("RB") ? ["RB","RWB"] :
        slot.startsWith("LB") ? ["LB","LWB"] :
        slot.startsWith("CB") ? ["CB"] :
        slot.startsWith("CDM") ? ["CDM","CM"] :
        slot.startsWith("CM") ? ["CM","CDM","CAM"] :
        slot.startsWith("CAM") || slot.startsWith("RAM") || slot.startsWith("LAM") ? ["CAM","CM","RW","LW"] :
        slot.startsWith("RM") ? ["RM","RW"] :
        slot.startsWith("LM") ? ["LM","LW"] :
        slot.startsWith("RW") ? ["RW","RM"] :
        slot.startsWith("LW") ? ["LW","LM"] :
        slot.startsWith("ST") ? ["ST"] :
        [];

      let picked = takeBy(p => want.includes((p.positions||[])[0]));
      if (!picked) picked = takeBy(_ => true); // fallback: pega o melhor disponível

      lineup.starters[slot] = picked;
    }

    renderSlots();
  }

  el.querySelector("#autoXI").addEventListener("click", autoPickXI);

  el.querySelector("#save").addEventListener("click", () => {
    const v = validateLineup(lineup);
    if (!v.ok) {
      alert(`Não foi possível salvar: ${v.reason}`);
      return;
    }
    store.update(s => ({
      ...s,
      career: {
        ...s.career,
        lineup: {
          formationId: lineup.formationId,
          starters: lineup.starters,
          bench: lineup.bench
        }
      }
    }));
    alert("Tática/escalação salva com sucesso.");
    computeAndRenderBadges();
  });

  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  $formation.addEventListener("change", () => {
    lineup.formationId = $formation.value;
    // mantém escolha se keys coincidem? por simplicidade: limpa starters ao trocar
    lineup.starters = {};
    renderSlots();
  });

  shell.mount(el);
  renderSlots();
  computeAndRenderBadges();
  return { render() {} };
}