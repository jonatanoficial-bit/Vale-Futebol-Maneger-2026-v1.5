/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/market-ui.js — Mercado AAA com Folha/FFP
   -------------------------------------------------------
   - Mostra painel financeiro (caixa, folha, limite, FFP)
   - Lista jogadores com preço/salário
   - Contratação bloqueia se estourar limite/FFP/caixa
   - Funciona com filtros já existentes no index:
       #filtro-posicao, #filtro-min-ovr, #filtro-max-valor, #filtro-premium
       #lista-mercado
   - Integra com Database.players e Finances

   Exporta:
   - window.MarketUI.open()
   - garante UI.abrirMercado() se não existir

   =======================================================*/

(function () {
  console.log("%c[MarketUI] market-ui.js AAA carregado", "color:#fb7185; font-weight:bold;");

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.seasonYear) gs.seasonYear = 2026;
    return gs;
  }

  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }

  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  function getTeams() {
    try { return (window.Database && Array.isArray(Database.teams)) ? Database.teams : []; }
    catch (e) { return []; }
  }
  function getPlayers() {
    try { return (window.Database && Array.isArray(Database.players)) ? Database.players : []; }
    catch (e) { return []; }
  }
  function getTeam(teamId) {
    return getTeams().find(t => String(t.id) === String(teamId)) || null;
  }

  function getPos(p) { return String(p?.position || p?.posicao || p?.pos || "—").toUpperCase(); }
  function getOVR(p) { return n(p?.ovr ?? p?.overall ?? p?.OVR ?? p?.rating, 70); }
  function getValue(p) { return n(p?.value ?? p?.valor ?? p?.marketValue ?? p?.price, 0); }
  function getSalary(p) { return n(p?.salary ?? p?.wage ?? p?.salario, 0); }
  function getName(p) { return p?.name || p?.nome || `Jogador ${p?.id ?? ""}`; }

  function injectCssOnce() {
    if (document.getElementById("vf-market-css")) return;
    const s = document.createElement("style");
    s.id = "vf-market-css";
    s.textContent = `
      .vf-market-wrap{max-width:1100px;margin:0 auto;}
      .vf-market-hud{
        border-radius:18px;
        border:1px solid rgba(255,255,255,.10);
        background: radial-gradient(900px 500px at 10% 0%, rgba(96,165,250,.16), transparent 60%),
                    radial-gradient(900px 500px at 80% 0%, rgba(34,197,94,.14), transparent 55%),
                    rgba(0,0,0,.35);
        box-shadow:0 16px 40px rgba(0,0,0,.35);
        padding:12px;
        display:grid;
        grid-template-columns: 1.2fr 1fr 1fr 1fr;
        gap:10px;
        margin-bottom:12px;
      }
      @media(max-width:980px){ .vf-market-hud{grid-template-columns:1fr 1fr; } }
      @media(max-width:520px){ .vf-market-hud{grid-template-columns:1fr; } }

      .vf-metric{
        border-radius:16px;
        border:1px solid rgba(255,255,255,.08);
        background: rgba(0,0,0,.22);
        padding:10px;
      }
      .vf-metric .k{font-weight:1000;text-transform:uppercase;letter-spacing:.7px;font-size:11px;opacity:.85;}
      .vf-metric .v{font-weight:1000;font-size:18px;margin-top:4px;}
      .vf-metric .s{font-weight:900;font-size:12px;opacity:.75;margin-top:2px;}

      .vf-pill{
        display:inline-flex;align-items:center;gap:8px;
        padding:6px 10px;border-radius:999px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        font-weight:1000;font-size:11px;
      }
      .vf-ok{color:#86efac;}
      .vf-warn{color:#fbbf24;}
      .vf-bad{color:#fb7185;}

      .vf-market-list{
        display:grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap:10px;
      }
      .vf-card{
        border-radius:18px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(0,0,0,.28);
        box-shadow:0 12px 28px rgba(0,0,0,.30);
        padding:12px;
        display:flex;
        flex-direction:column;
        isolate:isolate;
        position:relative;
        overflow:hidden;
      }
      .vf-card .top{
        display:flex;
        align-items:flex-start;
        justify-content:space-between;
        gap:10px;
      }
      .vf-card .nm{font-weight:1000;}
      .vf-card .sub{font-weight:900;font-size:12px;opacity:.75;margin-top:2px;}
      .vf-card .meta{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        margin-top:10px;
      }
      .vf-btn{
        border-radius:14px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        color: rgba(255,255,255,.92);
        font-weight:1000;
        padding:10px 12px;
        cursor:pointer;
        margin-top:10px;
        width:100%;
      }
      .vf-btn.primary{background: rgba(34,197,94,.18);}
      .vf-btn.block{background: rgba(251,113,133,.12); cursor:not-allowed;}
      .vf-note{font-weight:900;font-size:12px;opacity:.75;margin-top:8px;line-height:1.3;}
    `;
    document.head.appendChild(s);
  }

  function classByRatio(r) {
    if (r <= 0.82) return "vf-ok";
    if (r <= 1.00) return "vf-warn";
    return "vf-bad";
  }

  function ensureFinancesReady(teamId) {
    try { if (window.Finances && typeof Finances.ensure === "function") Finances.ensure(); } catch (e) {}
    try { if (window.Finances) Finances.getClub(teamId); } catch (e) {}
  }

  function showScreen(id) {
    try {
      if (window.UI && typeof UI.mostrarTela === "function") { UI.mostrarTela(id); return; }
    } catch (e) {}
    document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
    const el = document.getElementById(id);
    if (el) el.classList.add("ativa");
  }

  function buildHUD(teamId) {
    const team = getTeam(teamId);
    const club = window.Finances ? Finances.getClub(teamId) : { cash: 0, payroll: 0, payrollLimit: 0 };
    const ffp = window.Finances ? Finances.getFFP(teamId) : { net: 0, income: 0, costs: 0 };

    const payrollRatio = (club.payrollLimit > 0) ? (club.payroll / club.payrollLimit) : 0;
    const payClass = classByRatio(payrollRatio);

    const ffpOk = n(ffp.net, 0) >= -10;
    const ffpClass = ffpOk ? "vf-ok" : "vf-bad";

    const wrap = document.createElement("div");
    wrap.className = "vf-market-hud";

    const m0 = document.createElement("div");
    m0.className = "vf-metric";
    m0.innerHTML = `
      <div class="k">Clube</div>
      <div class="v">${team?.name || "Seu time"}</div>
      <div class="s">Temporada ${ensureGS().seasonYear}</div>
    `;

    const m1 = document.createElement("div");
    m1.className = "vf-metric";
    m1.innerHTML = `
      <div class="k">Caixa</div>
      <div class="v">${window.Finances ? Finances.formatMoney(club.cash) : club.cash}</div>
      <div class="s">Disponível para mercado</div>
    `;

    const m2 = document.createElement("div");
    m2.className = "vf-metric";
    m2.innerHTML = `
      <div class="k">Folha (mensal)</div>
      <div class="v">${window.Finances ? Finances.formatMoney(club.payroll) : club.payroll} / ${window.Finances ? Finances.formatMoney(club.payrollLimit) : club.payrollLimit}</div>
      <div class="s"><span class="vf-pill ${payClass}">${Math.round(payrollRatio*100)}%</span></div>
    `;

    const m3 = document.createElement("div");
    m3.className = "vf-metric";
    m3.innerHTML = `
      <div class="k">FFP (net)</div>
      <div class="v">${window.Finances ? Finances.formatMoney(ffp.net) : ffp.net}</div>
      <div class="s"><span class="vf-pill ${ffpClass}">${ffpOk ? "Saudável" : "Risco"}</span></div>
    `;

    wrap.appendChild(m0);
    wrap.appendChild(m1);
    wrap.appendChild(m2);
    wrap.appendChild(m3);

    return wrap;
  }

  function getMarketPool(teamId) {
    // mercado = jogadores que NÃO são do usuário
    const all = getPlayers();
    return all.filter(p => String(p.teamId) !== String(teamId));
  }

  function applyFilters(list) {
    const posSel = document.getElementById("filtro-posicao")?.value || "todos";
    const minOvr = n(document.getElementById("filtro-min-ovr")?.value, 70);
    const maxVal = n(document.getElementById("filtro-max-valor")?.value, 10);
    const premium = !!document.getElementById("filtro-premium")?.checked;

    const maxValueAbs = maxVal; // seu jogo já usa "mi" nos inputs
    return list.filter(p => {
      const pos = getPos(p);
      const ovr = getOVR(p);
      const val = getValue(p);

      if (posSel !== "todos" && pos !== posSel) return false;
      if (ovr < minOvr) return false;
      if (maxValueAbs > 0 && val > maxValueAbs) return false;
      if (premium && ovr < 83) return false;
      return true;
    });
  }

  function buildPlayerCard(teamId, p) {
    const ovr = getOVR(p);
    const val = getValue(p);
    const sal = getSalary(p);

    // oferta padrão: fee = valor, salary = salário atual
    const offer = {
      playerId: p.id,
      fromTeamId: p.teamId,
      toTeamId: teamId,
      fee: val,
      salary: sal,
      contractMonths: 24
    };

    const check = window.Finances ? Finances.canAffordOffer(teamId, offer) : { cashOk: true, payrollOk: true, ffpOk: true };
    const ok = !!(check.cashOk && check.payrollOk && check.ffpOk);

    const card = document.createElement("div");
    card.className = "vf-card";

    const pillOVR = `<span class="vf-pill vf-ok">OVR ${ovr}</span>`;
    const pillPOS = `<span class="vf-pill">${getPos(p)}</span>`;
    const pillVAL = `<span class="vf-pill vf-warn">Valor ${window.Finances ? Finances.formatMoney(val) : val}</span>`;
    const pillSAL = `<span class="vf-pill vf-warn">Salário ${window.Finances ? Finances.formatMoney(sal) : sal}</span>`;

    card.innerHTML = `
      <div class="top">
        <div style="min-width:0;">
          <div class="nm">${getName(p)}</div>
          <div class="sub">${getPos(p)} • Clube ${p.teamId}</div>
        </div>
        ${pillOVR}
      </div>
      <div class="meta">
        ${pillPOS}
        ${pillVAL}
        ${pillSAL}
      </div>
    `;

    const btn = document.createElement("button");
    btn.className = "vf-btn " + (ok ? "primary" : "block");
    btn.textContent = ok ? "Fazer proposta" : "Bloqueado (limites)";
    btn.disabled = !ok;

    const note = document.createElement("div");
    note.className = "vf-note";

    if (!ok) {
      const reasons = [];
      if (!check.cashOk) reasons.push("Caixa insuficiente");
      if (!check.payrollOk) reasons.push("Estoura a folha");
      if (!check.ffpOk) reasons.push("Risco FFP");
      note.textContent = "Motivo: " + (reasons.join(" • ") || "Limites");
    } else {
      note.textContent = "Dica: ofertas aumentam sua folha e afetam o FFP.";
    }

    btn.onclick = () => {
      try {
        // aplica a compra (finanças)
        if (window.Finances) Finances.applyTransfer(teamId, offer);

        // transfere jogador para o seu time (DB em memória)
        p.teamId = teamId;

        // feedback
        alert(`Contratação concluída: ${getName(p)}\nFee: ${Finances.formatMoney(val)} • Salário: ${Finances.formatMoney(sal)}`);

        // re-render
        render();
      } catch (e) {
        alert("Erro ao contratar: " + (e?.message || e));
      }
    };

    card.appendChild(btn);
    card.appendChild(note);

    return card;
  }

  function render() {
    injectCssOnce();

    const teamId = getUserTeamId();
    if (!teamId) {
      alert("Nenhum time selecionado (gameState.currentTeamId).");
      return;
    }

    ensureFinancesReady(teamId);

    const tela = document.getElementById("tela-mercado");
    const listRoot = document.getElementById("lista-mercado");
    if (!tela || !listRoot) {
      alert("Tela de mercado não encontrada (#tela-mercado / #lista-mercado).");
      return;
    }

    // cria container AAA dentro da tela
    let wrap = document.getElementById("vf-market-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "vf-market-wrap";
      wrap.className = "vf-market-wrap";

      // insere antes da lista
      listRoot.parentNode.insertBefore(wrap, listRoot);
    }

    wrap.innerHTML = "";
    wrap.appendChild(buildHUD(teamId));

    // lista mercado
    let pool = getMarketPool(teamId);
    pool = applyFilters(pool);
    pool = pool.sort((a, b) => getOVR(b) - getOVR(a)).slice(0, 60);

    listRoot.innerHTML = "";
    const grid = document.createElement("div");
    grid.className = "vf-market-list";

    if (!pool.length) {
      listRoot.innerHTML = `<p style="opacity:.75;font-weight:900;">Nenhum jogador encontrado com os filtros atuais.</p>`;
      return;
    }

    pool.forEach(p => grid.appendChild(buildPlayerCard(teamId, p)));
    listRoot.appendChild(grid);
  }

  function bindFilters() {
    const ids = ["filtro-posicao", "filtro-min-ovr", "filtro-max-valor", "filtro-premium"];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (!el || el.__vfBound) return;
      el.__vfBound = true;
      el.addEventListener("change", () => {
        try { render(); } catch (e) {}
      });
      el.addEventListener("input", () => {
        try { render(); } catch (e) {}
      });
    });
  }

  function open() {
    showScreen("tela-mercado");
    bindFilters();
    render();
  }

  // Export
  window.MarketUI = { open, render };

  // Compat: garantir UI.abrirMercado (sem quebrar seu projeto)
  if (!window.UI) window.UI = {};
  if (typeof UI.abrirMercado !== "function") {
    UI.abrirMercado = open;
  }

  // Se a tela abrir por outro caminho, ainda dá para chamar MarketUI.render() manualmente.
})();