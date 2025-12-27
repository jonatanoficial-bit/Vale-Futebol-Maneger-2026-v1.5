/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/market-ui.js — Mercado AAA (Folha/FFP/Wage Cap)
   -------------------------------------------------------
   O que entrega:
   - Painel topo com:
     • Saldo (se existir no gameState)
     • Folha usada vs Limite (Wage Cap)
     • Alertas FFP (estourou / perigoso)
   - Lista de jogadores do mercado com:
     • Face, pos, ovr
     • Salário (se Contracts existir)
     • Tag: CABE / ESTOURA / CARO
   - Filtros: busca, posição, OVR mínimo, custo máximo (salário)
   - Botão: CONTRATAR (chama Market.signPlayer / Market.buyPlayer se existirem)
   - Fallback robusto se seu engine ainda não expõe os métodos
   =======================================================*/

(function () {
  console.log("%c[MarketUI] market-ui.js carregado", "color:#60a5fa; font-weight:bold;");

  // -----------------------------
  // CSS AAA injetado (não precisa mexer em arquivo CSS)
  // -----------------------------
  function injectCssOnce() {
    if (document.getElementById("vf-market-css")) return;
    const style = document.createElement("style");
    style.id = "vf-market-css";
    style.textContent = `
      .vf-wrap{max-width:1100px;margin:0 auto;padding:10px}
      .vf-topbar{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}
      .vf-card{background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:12px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
      .vf-card h3{margin:0 0 6px 0;font-size:13px;letter-spacing:.6px;text-transform:uppercase;opacity:.9}
      .vf-metrics{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
      .vf-metric{min-width:180px}
      .vf-metric .big{font-weight:900;font-size:18px}
      .vf-metric .sub{opacity:.75;font-size:12px}
      .vf-bar{height:12px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
      .vf-bar > div{height:100%;width:0%}
      .vf-alert{font-size:12px;margin-top:8px;opacity:.9}
      .vf-alert.ok{color:#86efac}
      .vf-alert.warn{color:#fbbf24}
      .vf-alert.bad{color:#fb7185}

      .vf-filters{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}
      .vf-filters input,.vf-filters select{
        padding:10px;border-radius:14px;border:1px solid rgba(255,255,255,.10);
        background:rgba(0,0,0,.35);color:#fff;font-weight:800;outline:none
      }
      .vf-filters label{font-size:11px;opacity:.75;font-weight:900;display:block;margin:0 0 4px 2px}

      .vf-list{display:grid;grid-template-columns:1fr;gap:8px;margin-top:10px}
      .vf-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .vf-left{display:flex;align-items:center;gap:10px;min-width:0}
      .vf-face{width:44px;height:44px;border-radius:12px;object-fit:cover;border:1px solid rgba(255,255,255,.12)}
      .vf-name{font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .vf-meta{opacity:.75;font-size:12px;white-space:nowrap}
      .vf-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}
      .vf-pill{padding:6px 10px;border-radius:999px;font-weight:900;font-size:11px;letter-spacing:.3px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.06)}
      .vf-pill.ok{color:#86efac}
      .vf-pill.warn{color:#fbbf24}
      .vf-pill.bad{color:#fb7185}
      .vf-btn{padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(59,130,246,.18);color:#fff;font-weight:900;cursor:pointer}
      .vf-btn:disabled{opacity:.45;cursor:not-allowed}
      .vf-muted{opacity:.75;font-size:12px}
    `;
    document.head.appendChild(style);
  }

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clear(node) { if (!node) return; while (node.firstChild) node.removeChild(node.firstChild); }
  function el(tag, cls, txt) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (txt != null) d.textContent = txt;
    return d;
  }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (gs.money == null) gs.money = 50; // fallback
    return gs;
  }

  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  function getPlayers() {
    return (window.Database && Array.isArray(Database.players)) ? Database.players : [];
  }

  // -----------------------------
  // Contracts integration (Wage cap / wages)
  // -----------------------------
  function ensureContracts() {
    try { if (window.Contracts && typeof Contracts.ensure === "function") Contracts.ensure(); } catch (e) {}
  }

  function getWageCap(teamId) {
    // se Contracts tiver cap, usa
    try {
      if (window.Contracts && typeof Contracts.getWageCap === "function") return n(Contracts.getWageCap(teamId), 40);
      if (window.Contracts && typeof Contracts.wageCap === "number") return n(Contracts.wageCap, 40);
    } catch (e) {}
    // fallback: cap por divisão (bem simples)
    const team = (window.Database?.teams || []).find(t => String(t.id) === String(teamId));
    const div = String(team?.division || team?.serie || "A").toUpperCase();
    return div === "B" ? 25 : 45; // milhões/mês (ajuste depois)
  }

  function getWageUsed(teamId) {
    try {
      if (window.Contracts && typeof Contracts.getWageUsed === "function") return n(Contracts.getWageUsed(teamId), 0);
      if (window.Contracts && typeof Contracts.recalcWageUsed === "function") {
        const v = Contracts.recalcWageUsed(teamId);
        if (v != null) return n(v, 0);
      }
      if (window.gameState && typeof gameState.wageUsed === "number") return n(gameState.wageUsed, 0);
    } catch (e) {}
    return 0;
  }

  function getPlayerWageMi(playerId) {
    // tenta pegar do Contracts; se não tiver, cria estimativa por OVR
    try {
      if (window.Contracts && typeof Contracts.getContractForPlayer === "function") {
        const c = Contracts.getContractForPlayer(playerId);
        if (c && c.wageMi != null) return n(c.wageMi, 0);
      }
    } catch (e) {}

    const p = getPlayers().find(x => String(x.id) === String(playerId));
    const ovr = n(p?.ovr ?? p?.overall, 60);
    // estimativa: 0.15 a 1.60 mi/mês
    return clamp(((ovr - 55) / 45) * 1.45 + 0.15, 0.10, 2.00);
  }

  // -----------------------------
  // Mercado data (fallback)
  // -----------------------------
  function getMarketPool(teamId) {
    // Se engine tiver lista própria:
    try {
      if (window.Market && typeof Market.getMarketList === "function") {
        const arr = Market.getMarketList();
        if (Array.isArray(arr) && arr.length) return arr;
      }
    } catch (e) {}

    const all = getPlayers().slice();
    // Regra fallback:
    // - jogadores que NÃO são do seu time
    // - se existir campo "isFreeAgent" / "freeAgent", prioriza
    const mine = String(teamId);
    const free = all.filter(p => p?.isFreeAgent || p?.freeAgent || String(p.teamId) === "0" || p.teamId == null);
    const others = all.filter(p => String(p.teamId) !== mine);

    const pool = free.length ? free : others;
    // corta para performance (celular)
    return pool.slice(0, 220);
  }

  // -----------------------------
  // Ações (assinar/contratar)
  // -----------------------------
  function canAfford(teamId, playerId) {
    const cap = getWageCap(teamId);
    const used = getWageUsed(teamId);
    const wage = getPlayerWageMi(playerId);
    return (used + wage) <= cap;
  }

  function signPlayer(teamId, playerId) {
    // Tenta usar engine:
    try {
      if (window.Market && typeof Market.signPlayer === "function") return Market.signPlayer(teamId, playerId);
      if (window.Market && typeof Market.buyPlayer === "function") return Market.buyPlayer(teamId, playerId);
    } catch (e) {}

    // fallback direto no DB:
    const p = getPlayers().find(x => String(x.id) === String(playerId));
    if (!p) return { ok: false, msg: "Jogador não encontrado." };

    p.teamId = teamId;

    // cria contrato mínimo se Contracts existir
    try {
      if (window.Contracts && typeof Contracts.setContractForPlayer === "function") {
        const wage = getPlayerWageMi(playerId);
        Contracts.setContractForPlayer(playerId, { wageMi: wage, monthsLeft: 24 });
      }
    } catch (e) {}

    // recalcula folha
    try { if (window.Contracts && typeof Contracts.recalcWageUsed === "function") Contracts.recalcWageUsed(teamId); } catch (e) {}

    // notícia
    try {
      if (window.News && typeof News.pushNews === "function") {
        News.pushNews("Contratação", `Seu clube contratou ${p.name || p.nome || "um jogador"} no mercado.`, "MARKET");
      }
    } catch (e) {}

    // salvar
    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}

    return { ok: true, msg: "Contratação realizada." };
  }

  // -----------------------------
  // Render
  // -----------------------------
  function renderMarket() {
    injectCssOnce();
    ensureContracts();

    const teamId = getUserTeamId();
    const listNode = document.getElementById("lista-mercado");
    clear(listNode);

    if (!teamId) {
      listNode.appendChild(el("div", "vf-muted", "Selecione um time primeiro."));
      return;
    }

    const gs = ensureGS();

    const wrap = el("div", "vf-wrap");
    listNode.appendChild(wrap);

    // Topbar
    const top = el("div", "vf-topbar");
    wrap.appendChild(top);

    const cap = getWageCap(teamId);
    const used = getWageUsed(teamId);
    const pct = cap <= 0 ? 0 : clamp((used / cap) * 100, 0, 180);

    // Card 1 - Finanças
    const c1 = el("div", "vf-card");
    c1.appendChild(el("h3", "", "FINANÇAS"));
    const met = el("div", "vf-metrics");

    const m1 = el("div", "vf-metric");
    m1.appendChild(el("div", "big", `R$ ${n(gs.money, 0).toFixed(1)} mi`));
    m1.appendChild(el("div", "sub", "Saldo disponível (fallback se não existir)"));
    met.appendChild(m1);

    const m2 = el("div", "vf-metric");
    m2.appendChild(el("div", "big", `R$ ${used.toFixed(2)} / ${cap.toFixed(2)} mi`));
    m2.appendChild(el("div", "sub", "Folha mensal (Wage Cap)"));
    met.appendChild(m2);

    c1.appendChild(met);

    const bar = el("div", "vf-bar");
    const fill = document.createElement("div");
    fill.style.width = `${clamp(pct, 0, 180)}%`;
    // cor por status via classes simples
    if (pct < 75) fill.style.background = "rgba(134,239,172,.85)";
    else if (pct < 95) fill.style.background = "rgba(251,191,36,.85)";
    else fill.style.background = "rgba(251,113,133,.85)";
    bar.appendChild(fill);
    c1.appendChild(bar);

    const alert = el("div", "vf-alert");
    if (pct < 75) { alert.className = "vf-alert ok"; alert.textContent = "FFP: OK — sua folha está saudável."; }
    else if (pct < 95) { alert.className = "vf-alert warn"; alert.textContent = "FFP: ATENÇÃO — você está perto do limite de folha."; }
    else { alert.className = "vf-alert bad"; alert.textContent = "FFP: ESTOURADO — contratações podem ser bloqueadas/penalizadas."; }
    c1.appendChild(alert);

    top.appendChild(c1);

    // Card 2 - Ajuda rápida
    const c2 = el("div", "vf-card");
    c2.appendChild(el("h3", "", "DICAS AAA"));
    c2.appendChild(el("div", "vf-muted",
      "• CABE: salário cabe na folha.\n• ESTOURA: excede o Wage Cap.\n• CARO: cabe, mas te deixa em risco FFP."
    ));
    top.appendChild(c2);

    // Filtros
    const filters = el("div", "vf-card");
    filters.appendChild(el("h3", "", "FILTROS"));
    const fwrap = el("div", "vf-filters");

    const qWrap = el("div", "");
    qWrap.appendChild(el("label", "", "Busca"));
    const q = document.createElement("input");
    q.placeholder = "Nome do jogador…";
    qWrap.appendChild(q);

    const posWrap = el("div", "");
    posWrap.appendChild(el("label", "", "Posição"));
    const pos = document.createElement("select");
    ["TODAS", "GOL", "ZAG", "LD", "LE", "VOL", "MEI", "PON", "ATA"].forEach(v => {
      const o = document.createElement("option"); o.value = v; o.textContent = v; pos.appendChild(o);
    });
    posWrap.appendChild(pos);

    const ovrWrap = el("div", "");
    ovrWrap.appendChild(el("label", "", "OVR mín."));
    const ovr = document.createElement("input");
    ovr.type = "number";
    ovr.value = "60";
    ovr.min = "40";
    ovr.max = "99";
    ovrWrap.appendChild(ovr);

    const wageWrap = el("div", "");
    wageWrap.appendChild(el("label", "", "Salário máx (mi/mês)"));
    const wage = document.createElement("input");
    wage.type = "number";
    wage.step = "0.05";
    wage.value = "2.00";
    wage.min = "0";
    wage.max = "10";
    wageWrap.appendChild(wage);

    const refreshBtn = document.createElement("button");
    refreshBtn.className = "vf-btn";
    refreshBtn.textContent = "ATUALIZAR LISTA";
    refreshBtn.onclick = () => drawList();

    fwrap.appendChild(qWrap);
    fwrap.appendChild(posWrap);
    fwrap.appendChild(ovrWrap);
    fwrap.appendChild(wageWrap);
    fwrap.appendChild(refreshBtn);

    filters.appendChild(fwrap);
    wrap.appendChild(filters);

    // Lista
    const list = el("div", "vf-list");
    wrap.appendChild(list);

    function normalizePos(p) {
      const s = String(p.pos || p.position || "").toUpperCase();
      if (!s) return "MEI";
      if (s.includes("GOL") || s === "GK") return "GOL";
      if (s.includes("ZAG") || s.includes("CB")) return "ZAG";
      if (s.includes("LD") || s.includes("RB")) return "LD";
      if (s.includes("LE") || s.includes("LB")) return "LE";
      if (s.includes("VOL") || s.includes("DM")) return "VOL";
      if (s.includes("MEI") || s.includes("MID") || s.includes("CM") || s.includes("AM")) return "MEI";
      if (s.includes("PON") || s.includes("W")) return "PON";
      if (s.includes("ATA") || s.includes("ST") || s.includes("FW")) return "ATA";
      return "MEI";
    }

    function statusTag(teamId, playerId) {
      const cap = getWageCap(teamId);
      const used = getWageUsed(teamId);
      const w = getPlayerWageMi(playerId);
      const after = used + w;
      const pctAfter = cap <= 0 ? 999 : (after / cap) * 100;

      if (after > cap) return { cls: "bad", txt: "ESTOURA" };
      if (pctAfter >= 95) return { cls: "warn", txt: "CARO" };
      return { cls: "ok", txt: "CABE" };
    }

    function drawList() {
      clear(list);

      const pool = getMarketPool(teamId);

      const query = String(q.value || "").trim().toLowerCase();
      const wantPos = String(pos.value || "TODAS").toUpperCase();
      const minOvr = clamp(n(ovr.value, 60), 40, 99);
      const maxWage = clamp(n(wage.value, 2.0), 0, 50);

      const filtered = pool
        .filter(p => {
          const name = String(p.name || p.nome || "").toLowerCase();
          if (query && !name.includes(query)) return false;
          const o = n(p.ovr ?? p.overall, 0);
          if (o < minOvr) return false;
          const ppos = normalizePos(p);
          if (wantPos !== "TODAS" && ppos !== wantPos) return false;
          const w = getPlayerWageMi(p.id);
          if (w > maxWage) return false;
          // não listar os do seu time
          if (String(p.teamId) === String(teamId)) return false;
          return true;
        })
        .slice(0, 120);

      if (!filtered.length) {
        list.appendChild(el("div", "vf-card vf-muted", "Nenhum jogador encontrado com esses filtros."));
        return;
      }

      filtered.forEach(p => {
        const rowCard = el("div", "vf-card");

        const row = el("div", "vf-row");
        const left = el("div", "vf-left");

        const face = el("img", "vf-face");
        face.src = `assets/faces/${p.id}.png`;
        face.onerror = () => { face.src = "assets/faces/default.png"; };

        const nameBox = el("div", "");
        const nm = el("div", "vf-name", p.name || p.nome || `Jogador ${p.id}`);
        const meta = el("div", "vf-meta",
          `${normalizePos(p)} • OVR ${n(p.ovr ?? p.overall, 0)} • Salário ~ R$ ${getPlayerWageMi(p.id).toFixed(2)} mi/mês`
        );
        nameBox.appendChild(nm);
        nameBox.appendChild(meta);

        left.appendChild(face);
        left.appendChild(nameBox);

        const right = el("div", "vf-right");

        const tag = statusTag(teamId, p.id);
        const pill = el("span", `vf-pill ${tag.cls}`, tag.txt);
        right.appendChild(pill);

        const btn = document.createElement("button");
        btn.className = "vf-btn";
        btn.textContent = "CONTRATAR";
        btn.disabled = (tag.txt === "ESTOURA"); // trava estourado
        btn.onclick = () => {
          // Confirma e contrata
          const ok = confirm(
            `Contratar ${p.name || p.nome}?\n` +
            `Salário estimado: R$ ${getPlayerWageMi(p.id).toFixed(2)} mi/mês\n` +
            `Folha atual: R$ ${getWageUsed(teamId).toFixed(2)} / ${getWageCap(teamId).toFixed(2)} mi`
          );
          if (!ok) return;

          const res = signPlayer(teamId, p.id);
          alert(res?.msg || "Ação concluída.");
          // re-render
          renderMarket();
        };
        right.appendChild(btn);

        row.appendChild(left);
        row.appendChild(right);

        rowCard.appendChild(row);
        list.appendChild(rowCard);
      });
    }

    // primeira renderização
    drawList();
  }

  // Expor
  window.MarketUI = {
    renderMarket
  };
})();