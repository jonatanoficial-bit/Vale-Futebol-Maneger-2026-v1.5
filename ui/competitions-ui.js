/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/competitions-ui.js — Central de Competições AAA (SM26-like)
   -------------------------------------------------------
   - 3 abas: Liga (Série A/B), Copa do Brasil, Estadual
   - Usa engines:
     • League.getStandingsForCurrentDivision(), League.getCurrentRound()
     • Cup.getBracket(), Cup.getStatus()
     • Regionals.getStandings(), Regionals.getStatus(), Regionals.getCurrentRound()
   - NÃO quebra se algum engine não existir
   - Se #tela-competicoes não existir, cria overlay automático

   API:
   - CompetitionsUI.open()
   - CompetitionsUI.render()
   - CompetitionsUI.close()

   Integração:
   - Se existir #btn-competicoes, bind automático
   =======================================================*/

(function () {
  console.log("%c[CompetitionsUI] competitions-ui.js carregado", "color:#22c55e; font-weight:bold;");

  // -----------------------------
  // CSS AAA injetado
  // -----------------------------
  function injectCssOnce() {
    if (document.getElementById("vf-competitions-css")) return;
    const s = document.createElement("style");
    s.id = "vf-competitions-css";
    s.textContent = `
      .vf-comp-overlay{
        position:fixed; inset:0; z-index:9999;
        background: radial-gradient(1200px 600px at 20% 10%, rgba(96,165,250,.18), transparent 50%),
                    radial-gradient(1200px 600px at 80% 0%, rgba(167,139,250,.16), transparent 55%),
                    rgba(0,0,0,.72);
        backdrop-filter: blur(8px);
        display:none;
      }
      .vf-comp-overlay.active{display:block}

      .vf-comp-shell{
        max-width:1100px; margin: 18px auto; padding: 14px;
      }
      .vf-comp-topbar{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        padding: 12px 12px;
        border-radius: 18px;
        background: rgba(0,0,0,.38);
        border: 1px solid rgba(255,255,255,.10);
        box-shadow: 0 10px 30px rgba(0,0,0,.28);
      }
      .vf-comp-title{
        display:flex; flex-direction:column; gap:2px;
      }
      .vf-comp-title h2{
        margin:0;
        font-weight:1000;
        letter-spacing:.6px;
        text-transform:uppercase;
        font-size:14px;
      }
      .vf-comp-title .sub{
        opacity:.75;
        font-weight:900;
        font-size:12px;
      }
      .vf-comp-actions{display:flex; gap:8px; align-items:center; flex-wrap:wrap}
      .vf-comp-btn{
        border-radius: 14px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        color: rgba(255,255,255,.92);
        font-weight:1000;
        padding:10px 12px;
        cursor:pointer;
      }
      .vf-comp-btn.primary{
        background: rgba(96,165,250,.18);
      }

      .vf-comp-tabs{
        display:flex; gap:8px; flex-wrap:wrap;
        margin: 12px 0;
      }
      .vf-comp-tab{
        border-radius: 999px;
        padding: 10px 12px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(0,0,0,.30);
        cursor:pointer;
        font-weight:1000;
        letter-spacing:.3px;
        font-size:12px;
        opacity:.9;
      }
      .vf-comp-tab.active{
        background: rgba(96,165,250,.22);
        border-color: rgba(96,165,250,.35);
        opacity:1;
      }

      .vf-comp-grid{
        display:grid;
        grid-template-columns: 1.2fr .8fr;
        gap: 12px;
      }
      @media(max-width: 820px){
        .vf-comp-grid{grid-template-columns: 1fr}
      }

      .vf-card{
        border-radius: 18px;
        background: rgba(0,0,0,.35);
        border:1px solid rgba(255,255,255,.08);
        box-shadow: 0 10px 30px rgba(0,0,0,.25);
        padding: 12px;
      }
      .vf-card .hd{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        margin-bottom:10px;
      }
      .vf-card .hd .t{
        font-weight:1000;
        letter-spacing:.6px;
        text-transform:uppercase;
        font-size:12px;
        opacity:.9;
      }
      .vf-pill{
        display:inline-flex; align-items:center; gap:8px;
        padding:6px 10px; border-radius:999px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        font-weight:1000; font-size:11px; letter-spacing:.2px;
      }
      .vf-pill.ok{color:#86efac}
      .vf-pill.warn{color:#fbbf24}
      .vf-pill.bad{color:#fb7185}
      .vf-pill.blue{color:#60a5fa}
      .vf-muted{opacity:.75}

      .vf-table{
        display:grid; gap:6px;
      }
      .vf-row{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        padding: 8px 10px;
        border-radius: 14px;
        background: rgba(255,255,255,.05);
        border:1px solid rgba(255,255,255,.07);
      }
      .vf-row .l{
        display:flex; align-items:center; gap:10px; min-width:0;
        font-weight:1000;
      }
      .vf-row .l .pos{
        min-width:22px;
        opacity:.85;
      }
      .vf-row .l .name{
        overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
      }
      .vf-row .r{
        display:flex; align-items:center; gap:10px;
        font-weight:1000;
        opacity:.92;
      }
      .vf-row .mini{opacity:.75; font-weight:900; font-size:12px}
      .vf-row.user{
        border-color: rgba(96,165,250,.35);
        background: rgba(96,165,250,.10);
      }

      .vf-bracket{
        display:grid; gap:10px;
      }
      .vf-phase{
        border-radius: 16px;
        background: rgba(255,255,255,.05);
        border:1px solid rgba(255,255,255,.07);
        padding: 10px;
      }
      .vf-phase .ph{
        display:flex; align-items:center; justify-content:space-between; gap:8px;
        margin-bottom:8px;
      }
      .vf-phase .ph .name{
        font-weight:1000;
        letter-spacing:.4px;
        font-size:12px;
        opacity:.95;
        text-transform:uppercase;
      }
      .vf-phase .match{
        display:flex; justify-content:space-between; gap:10px;
        font-weight:1000;
      }
      .vf-phase .match .side{opacity:.92}
      .vf-phase .match .score{opacity:.9}
      .vf-phase.next{
        border-color: rgba(251,191,36,.35);
        background: rgba(251,191,36,.08);
      }
      .vf-phase.played{
        border-color: rgba(134,239,172,.25);
      }
      .vf-phase.locked{
        opacity:.70;
      }

      .vf-note{
        padding: 10px;
        border-radius: 16px;
        border:1px solid rgba(255,255,255,.08);
        background: rgba(0,0,0,.28);
        font-weight:900;
        opacity:.9;
      }
    `;
    document.head.appendChild(s);
  }

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = String(txt);
    return e;
  }
  function clear(node) { if (!node) return; node.innerHTML = ""; }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.seasonYear) gs.seasonYear = 2026;
    return gs;
  }
  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }
  function getTeamById(id) {
    return getTeams().find(t => String(t.id) === String(id)) || null;
  }
  function teamName(id) {
    return getTeamById(id)?.name || String(id || "—");
  }

  // -----------------------------
  // Overlay / Tela
  // -----------------------------
  let overlay = null;
  let root = null;
  let activeTab = "LEAGUE";

  function ensureOverlay() {
    injectCssOnce();

    // Se existir uma tela real no HTML, usamos ela
    const existing = document.getElementById("tela-competicoes");
    if (existing) {
      root = existing;
      return;
    }

    // Senão cria overlay próprio
    if (overlay) return;

    overlay = el("div", "vf-comp-overlay");
    overlay.id = "vf-competitions-overlay";

    const shell = el("div", "vf-comp-shell");
    overlay.appendChild(shell);

    // topbar
    const topbar = el("div", "vf-comp-topbar");
    const title = el("div", "vf-comp-title");
    const h2 = el("h2", "", "Central de Competições");
    const sub = el("div", "sub", "Série • Copa do Brasil • Estaduais");
    title.appendChild(h2);
    title.appendChild(sub);

    const actions = el("div", "vf-comp-actions");
    const btnClose = el("button", "vf-comp-btn", "Fechar");
    btnClose.onclick = () => CompetitionsUI.close();

    const btnLobby = el("button", "vf-comp-btn primary", "Voltar Lobby");
    btnLobby.onclick = () => {
      CompetitionsUI.close();
      try { if (window.UI && typeof UI.voltarLobby === "function") UI.voltarLobby(); } catch (e) {}
    };

    actions.appendChild(btnLobby);
    actions.appendChild(btnClose);

    topbar.appendChild(title);
    topbar.appendChild(actions);

    // tabs
    const tabs = el("div", "vf-comp-tabs");
    const t1 = el("div", "vf-comp-tab", "Série A/B");
    const t2 = el("div", "vf-comp-tab", "Copa do Brasil");
    const t3 = el("div", "vf-comp-tab", "Estadual");

    t1.dataset.tab = "LEAGUE";
    t2.dataset.tab = "CUP";
    t3.dataset.tab = "REGIONAL";

    tabs.appendChild(t1);
    tabs.appendChild(t2);
    tabs.appendChild(t3);

    // content
    const content = el("div", "");
    content.id = "vf-comp-content";

    shell.appendChild(topbar);
    shell.appendChild(tabs);
    shell.appendChild(content);

    document.body.appendChild(overlay);

    // tab click
    tabs.querySelectorAll(".vf-comp-tab").forEach(tab => {
      tab.onclick = () => {
        activeTab = tab.dataset.tab || "LEAGUE";
        CompetitionsUI.render();
      };
    });
  }

  function showOverlay() {
    if (overlay) overlay.classList.add("active");
  }
  function hideOverlay() {
    if (overlay) overlay.classList.remove("active");
  }

  // -----------------------------
  // Render: Liga
  // -----------------------------
  function renderLeague(content, teamId) {
    const grid = el("div", "vf-comp-grid");

    // left: tabela
    const cardTable = el("div", "vf-card");
    const hd = el("div", "hd");
    const title = el("div", "t", "Tabela (Série A/B)");

    let round = "—";
    try { if (window.League && typeof League.getCurrentRound === "function") round = String(League.getCurrentRound()); } catch (e) {}
    const pill = el("div", "vf-pill blue", `Rodada: ${round}`);

    hd.appendChild(title);
    hd.appendChild(pill);
    cardTable.appendChild(hd);

    const table = el("div", "vf-table");
    let standings = [];

    try {
      if (window.League && typeof League.getStandingsForCurrentDivision === "function") {
        standings = League.getStandingsForCurrentDivision() || [];
      }
    } catch (e) {}

    if (!Array.isArray(standings) || standings.length === 0) {
      table.appendChild(el("div", "vf-note vf-muted", "Tabela indisponível no momento."));
    } else {
      standings.slice(0, 20).forEach((r, idx) => {
        const row = el("div", "vf-row" + (String(r.id) === String(teamId) ? " user" : ""));
        const left = el("div", "l");
        left.appendChild(el("div", "pos", String(idx + 1)));
        left.appendChild(el("div", "name", r.name || teamName(r.id)));

        const right = el("div", "r");
        right.appendChild(el("div", "mini", `J ${n(r.pld,0)}`));
        right.appendChild(el("div", "mini", `SG ${n(r.gd,0)}`));
        right.appendChild(el("div", "", `${n(r.pts,0)} pts`));

        row.appendChild(left);
        row.appendChild(right);
        table.appendChild(row);
      });
    }

    cardTable.appendChild(table);

    // right: resumo + próximos jogos
    const cardSide = el("div", "vf-card");
    const hd2 = el("div", "hd");
    hd2.appendChild(el("div", "t", "Resumo"));

    // status / divisão
    let div = "—";
    const t = getTeamById(teamId);
    div = String(t?.division || t?.serie || "A").toUpperCase();

    const pill2 = el("div", "vf-pill", `Divisão: ${div}`);
    hd2.appendChild(pill2);

    cardSide.appendChild(hd2);

    const note = el("div", "vf-note");
    note.innerHTML = `<div style="font-weight:1000;">Objetivo</div><div class="vf-muted">Ganhar pontos, manter folha sob controle e buscar título/acesso.</div>`;
    cardSide.appendChild(note);

    // próximos 6 eventos do calendário (liga+geral)
    const upcoming = el("div", "vf-note");
    upcoming.style.marginTop = "10px";
    upcoming.innerHTML = `<div style="font-weight:1000;">Próximos jogos</div>`;
    const list = el("div", "vf-table");
    let next = [];
    try {
      if (window.Calendar && typeof Calendar.peekUpcoming === "function") {
        next = Calendar.peekUpcoming(teamId, 6) || [];
      } else if (window.Calendar && typeof Calendar.getAnnualEvents === "function") {
        const all = Calendar.getAnnualEvents(teamId) || [];
        next = all.slice(0, 6);
      }
    } catch (e) {}

    if (!Array.isArray(next) || next.length === 0) {
      list.appendChild(el("div", "vf-muted", "Sem calendário (ainda)."));
    } else {
      next.forEach(ev => {
        const row = el("div", "vf-row");
        const l = el("div", "l");
        l.appendChild(el("div", "pos", String(ev.date || "—").slice(5)));
        l.appendChild(el("div", "name", `${ev.competitionName || ev.comp || "Jogo"}`));

        const r = el("div", "r");
        r.appendChild(el("div", "mini", `${teamName(ev.homeId)} x ${teamName(ev.awayId)}`));
        r.appendChild(el("div", "mini", `${ev.comp || "—"}`));

        row.appendChild(l);
        row.appendChild(r);
        list.appendChild(row);
      });
    }

    upcoming.appendChild(list);
    cardSide.appendChild(upcoming);

    grid.appendChild(cardTable);
    grid.appendChild(cardSide);

    content.appendChild(grid);
  }

  // -----------------------------
  // Render: Copa do Brasil
  // -----------------------------
  function renderCup(content, teamId) {
    const grid = el("div", "vf-comp-grid");

    const cardBracket = el("div", "vf-card");
    const hd = el("div", "hd");
    hd.appendChild(el("div", "t", "Copa do Brasil — Caminho"));

    let statusPill = el("div", "vf-pill warn", "Status: —");
    try {
      if (window.Cup && typeof Cup.getStatus === "function") {
        const st = Cup.getStatus(teamId);
        if (st?.champion) statusPill = el("div", "vf-pill ok", "🏆 CAMPEÃO");
        else if (st?.eliminated) statusPill = el("div", "vf-pill bad", `❌ Eliminado (${st.phase || "—"})`);
        else if (st?.active) statusPill = el("div", "vf-pill warn", `➡️ Ativo (${st.phase || "—"})`);
      }
    } catch (e) {}

    hd.appendChild(statusPill);
    cardBracket.appendChild(hd);

    const bracketWrap = el("div", "vf-bracket");

    let bracket = null;
    try {
      if (window.Cup && typeof Cup.getBracket === "function") bracket = Cup.getBracket(teamId);
    } catch (e) {}

    if (!bracket || !Array.isArray(bracket.phases) || bracket.phases.length === 0) {
      bracketWrap.appendChild(el("div", "vf-note vf-muted", "Chaveamento indisponível (Cup engine não carregado?)."));
    } else {
      bracket.phases.forEach(ph => {
        const box = el("div", "vf-phase");
        if (ph.status === "NEXT") box.classList.add("next");
        else if (ph.status === "PLAYED") box.classList.add("played");
        else if (ph.status === "LOCKED") box.classList.add("locked");

        const top = el("div", "ph");
        top.appendChild(el("div", "name", ph.name || ph.key));
        const pill = el(
          "div",
          "vf-pill " + (ph.status === "NEXT" ? "warn" : ph.status === "PLAYED" ? "ok" : ""),
          ph.status === "NEXT" ? "PRÓXIMO" : ph.status === "PLAYED" ? "JOGADO" : "BLOQUEADO"
        );
        top.appendChild(pill);

        box.appendChild(top);

        const fx = ph.fixture;
        const res = ph.result;

        const match = el("div", "match");
        const left = el("div", "side", fx ? teamName(fx.homeId) : "—");
        const right = el("div", "side", fx ? teamName(fx.awayId) : "—");

        let score = "—";
        if (res) {
          score = `${n(res.gh,0)} x ${n(res.ga,0)}` + (res.decidedBy ? " (P)" : "");
        } else if (fx && fx.played && fx.goalsHome != null) {
          score = `${n(fx.goalsHome,0)} x ${n(fx.goalsAway,0)}` + (fx.decidedBy ? " (P)" : "");
        }

        const mid = el("div", "score", score);

        match.appendChild(left);
        match.appendChild(mid);
        match.appendChild(right);
        box.appendChild(match);

        if (fx?.date) box.appendChild(el("div", "vf-muted", `📅 ${fx.date}`));

        bracketWrap.appendChild(box);
      });
    }

    cardBracket.appendChild(bracketWrap);

    // right: instruções + próximos
    const cardSide = el("div", "vf-card");
    const hd2 = el("div", "hd");
    hd2.appendChild(el("div", "t", "Objetivo"));
    cardSide.appendChild(hd2);

    const note = el("div", "vf-note");
    note.innerHTML = `<div style="font-weight:1000;">Mata-mata</div>
      <div class="vf-muted">Vença para avançar. Empate vai para pênaltis.</div>`;
    cardSide.appendChild(note);

    const nextBox = el("div", "vf-note");
    nextBox.style.marginTop = "10px";
    nextBox.innerHTML = `<div style="font-weight:1000;">Próximo jogo</div>`;
    let fx = null;
    try { if (window.Cup && typeof Cup.getNextFixture === "function") fx = Cup.getNextFixture(teamId); } catch (e) {}

    if (!fx) {
      nextBox.appendChild(el("div", "vf-muted", "Sem jogo pendente (talvez eliminado ou campeão)."));
    } else {
      nextBox.appendChild(el("div", "", `${teamName(fx.homeId)} x ${teamName(fx.awayId)}`));
      nextBox.appendChild(el("div", "vf-muted", `${fx.phaseName || "Fase"} • ${fx.date || "—"}`));
    }

    cardSide.appendChild(nextBox);

    grid.appendChild(cardBracket);
    grid.appendChild(cardSide);

    content.appendChild(grid);
  }

  // -----------------------------
  // Render: Estadual
  // -----------------------------
  function renderRegional(content, teamId) {
    const grid = el("div", "vf-comp-grid");

    const cardTable = el("div", "vf-card");
    const hd = el("div", "hd");
    hd.appendChild(el("div", "t", "Estadual — Tabela"));

    // status estadual
    let pill = el("div", "vf-pill warn", "Status: —");
    try {
      if (window.Regionals && typeof Regionals.getStatus === "function") {
        const st = Regionals.getStatus(teamId);
        if (st?.finished && st?.championId) pill = el("div", "vf-pill ok", `🏆 Campeão: ${st.championName || teamName(st.championId)}`);
        else if (st?.active) pill = el("div", "vf-pill warn", `Rodada: ${st.round || "—"} • UF ${st.uf || "—"}`);
      }
    } catch (e) {}

    hd.appendChild(pill);
    cardTable.appendChild(hd);

    const table = el("div", "vf-table");
    let standings = [];
    try {
      if (window.Regionals && typeof Regionals.getStandings === "function") {
        standings = Regionals.getStandings(teamId) || [];
      }
    } catch (e) {}

    if (!Array.isArray(standings) || standings.length === 0) {
      table.appendChild(el("div", "vf-note vf-muted", "Tabela do Estadual indisponível."));
    } else {
      standings.slice(0, 20).forEach((r, idx) => {
        const row = el("div", "vf-row" + (String(r.id) === String(teamId) ? " user" : ""));
        const left = el("div", "l");
        left.appendChild(el("div", "pos", String(idx + 1)));
        left.appendChild(el("div", "name", r.name || teamName(r.id)));

        const right = el("div", "r");
        right.appendChild(el("div", "mini", `J ${n(r.pld,0)}`));
        right.appendChild(el("div", "mini", `SG ${n(r.gd,0)}`));
        right.appendChild(el("div", "", `${n(r.pts,0)} pts`));

        row.appendChild(left);
        row.appendChild(right);
        table.appendChild(row);
      });
    }

    cardTable.appendChild(table);

    // right: resumo + próximo
    const cardSide = el("div", "vf-card");
    const hd2 = el("div", "hd");
    hd2.appendChild(el("div", "t", "Resumo"));
    cardSide.appendChild(hd2);

    const note = el("div", "vf-note");
    note.innerHTML = `<div style="font-weight:1000;">Formato</div>
      <div class="vf-muted">12 rodadas (Jan–Mar). Campeão = 1º colocado.</div>`;
    cardSide.appendChild(note);

    const nextBox = el("div", "vf-note");
    nextBox.style.marginTop = "10px";
    nextBox.innerHTML = `<div style="font-weight:1000;">Próximo jogo</div>`;

    let fx = null;
    try { if (window.Regionals && typeof Regionals.getNextFixture === "function") fx = Regionals.getNextFixture(teamId); } catch (e) {}

    if (!fx) {
      nextBox.appendChild(el("div", "vf-muted", "Sem jogo pendente (talvez terminou)."));
    } else {
      nextBox.appendChild(el("div", "", `${teamName(fx.homeId)} x ${teamName(fx.awayId)}`));
      nextBox.appendChild(el("div", "vf-muted", `Rodada ${fx.roundNumber || "—"} • ${fx.date || "—"}`));
    }

    cardSide.appendChild(nextBox);

    grid.appendChild(cardTable);
    grid.appendChild(cardSide);

    content.appendChild(grid);
  }

  // -----------------------------
  // Render principal
  // -----------------------------
  function render() {
    ensureOverlay();

    const teamId = getUserTeamId();
    if (!teamId) {
      // se não tem time, tenta voltar
      if (overlay) {
        const content = document.getElementById("vf-comp-content");
        if (content) {
          clear(content);
          content.appendChild(el("div", "vf-card", ""));
          content.lastChild.appendChild(el("div", "vf-note", "Selecione um time antes de abrir Competições."));
        }
      }
      return;
    }

    // se existir uma tela real, você pode montar manualmente.
    // mas como garantimos overlay, usamos ele para renderizar.
    const content = document.getElementById("vf-comp-content");
    if (!content) return;

    // marca aba ativa
    if (overlay) {
      overlay.querySelectorAll(".vf-comp-tab").forEach(t => {
        t.classList.toggle("active", (t.dataset.tab || "") === activeTab);
      });
    }

    clear(content);

    // garantir engines
    try { if (window.Calendar && typeof Calendar.ensure === "function") Calendar.ensure(false); } catch (e) {}
    try { if (window.Cup && typeof Cup.ensure === "function") Cup.ensure(false); } catch (e) {}
    try { if (window.Regionals && typeof Regionals.ensure === "function") Regionals.ensure(false); } catch (e) {}

    if (activeTab === "LEAGUE") renderLeague(content, teamId);
    else if (activeTab === "CUP") renderCup(content, teamId);
    else if (activeTab === "REGIONAL") renderRegional(content, teamId);
    else renderLeague(content, teamId);
  }

  // -----------------------------
  // Open / Close
  // -----------------------------
  function open(tab) {
    ensureOverlay();
    if (tab) activeTab = String(tab).toUpperCase();
    render();
    showOverlay();
  }

  function close() {
    hideOverlay();
  }

  // -----------------------------
  // Bind automático em botão se existir
  // -----------------------------
  function bindAuto() {
    // botão opcional no seu HTML
    const btn = document.getElementById("btn-competicoes");
    if (btn && !btn.__vfBound) {
      btn.__vfBound = true;
      btn.addEventListener("click", () => open("LEAGUE"));
    }

    // se tiver algum menu com data-action
    document.querySelectorAll("[data-action='competicoes']").forEach(b => {
      if (b.__vfBound) return;
      b.__vfBound = true;
      b.addEventListener("click", () => open("LEAGUE"));
    });
  }

  setInterval(bindAuto, 800);

  // -----------------------------
  // Public API
  // -----------------------------
  window.CompetitionsUI = {
    open,
    render,
    close
  };
})();