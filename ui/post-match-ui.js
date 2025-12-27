/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/post-match-ui.js — Pós-Jogo AAA (SM26-like)
   -------------------------------------------------------
   Preenche a tela #tela-pos-jogo (index.html) com:
   - competição, rodada/fase
   - placar, logos, nomes
   - MOTM
   - estatísticas (posse/chutes/alvo/xG/esc/faltas)
   - momentos-chave
   - resultados da rodada (Liga) + fallbacks
   - status Copa/Estaduais (se existirem) embutidos nos momentos
   -------------------------------------------------------
   API:
   - PostMatchUI.render(report)
   =======================================================*/

(function () {
  console.log("%c[PostMatchUI] post-match-ui.js carregado", "color:#f97316; font-weight:bold;");

  // -----------------------------
  // CSS AAA injetado
  // -----------------------------
  function injectCssOnce() {
    if (document.getElementById("vf-postmatch-css")) return;
    const style = document.createElement("style");
    style.id = "vf-postmatch-css";
    style.textContent = `
      .pm-wrap{max-width:1100px;margin:0 auto}
      .pm-header{gap:14px}
      .pm-scoreboard{flex-wrap:wrap}
      .pm-motm{font-weight:1000}
      .pm-card{background:rgba(0,0,0,.35)!important;border:1px solid rgba(255,255,255,.08)!important;border-radius:18px!important;box-shadow:0 10px 30px rgba(0,0,0,.25)!important}
      .pm-card-title{letter-spacing:.6px;text-transform:uppercase;font-weight:1000;font-size:12px;opacity:.9}
      .pm-stats .row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)}
      .pm-stats .row:last-child{border-bottom:none}
      .pm-stats .k{opacity:.8;font-weight:900;font-size:12px}
      .pm-stats .v{font-weight:1000}
      .pm-moments .m{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06)}
      .pm-moments .m:last-child{border-bottom:none}
      .pm-moments .t{min-width:48px;font-weight:1000;opacity:.95}
      .pm-moments .d{font-weight:800;opacity:.92}
      .pm-round-results .rr{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06)}
      .pm-round-results .rr:last-child{border-bottom:none}
      .pm-round-results .rr .mid{opacity:.8;font-weight:900}
      .pm-pill{display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.06);font-weight:1000;font-size:11px;letter-spacing:.3px}
      .pm-pill.ok{color:#86efac}
      .pm-pill.warn{color:#fbbf24}
      .pm-pill.bad{color:#fb7185}
      .pm-muted{opacity:.75}
    `;
    document.head.appendChild(style);
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
  function clear(node) { if (!node) return; while (node.firstChild) node.removeChild(node.firstChild); }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }
  function getTeamById(id) {
    return getTeams().find(t => String(t.id) === String(id)) || null;
  }
  function teamName(id) {
    if (id == null) return "—";
    if (String(id) === "TBD") return "TBD";
    return getTeamById(id)?.name || String(id);
  }

  function setText(id, txt) {
    const node = document.getElementById(id);
    if (node) node.textContent = String(txt);
  }
  function setImg(id, teamId) {
    const node = document.getElementById(id);
    if (!node) return;
    node.src = `assets/logos/${teamId}.png`;
    node.onerror = () => { node.src = "assets/logos/default.png"; };
  }

  function compLabel(comp) {
    const c = String(comp || "").toUpperCase();
    if (c === "LEAGUE") return "LEAGUE";
    if (c === "CUP") return "CUP";
    if (c === "REGIONAL") return "REGIONAL";
    return "FRIENDLY";
  }

  // -----------------------------
  // Render helpers
  // -----------------------------
  function renderStats(node, report) {
    clear(node);
    const s = report?.stats || {};

    const rows = [
      ["POSSE", `${n(s.posseHome, 50)}% x ${n(s.posseAway, 50)}%`],
      ["CHUTES", `${n(s.chutesHome, 0)} x ${n(s.chutesAway, 0)}`],
      ["NO ALVO", `${n(s.alvoHome, 0)} x ${n(s.alvoAway, 0)}`],
      ["xG", `${n(s.xgHome, 0).toFixed(2)} x ${n(s.xgAway, 0).toFixed(2)}`],
      ["ESCANTEIOS", `${n(s.escanteiosHome, 0)} x ${n(s.escanteiosAway, 0)}`],
      ["FALTAS", `${n(s.faltasHome, 0)} x ${n(s.faltasAway, 0)}`]
    ];

    const wrap = el("div", "pm-stats");
    rows.forEach(([k, v]) => {
      const r = el("div", "row");
      r.appendChild(el("div", "k", k));
      r.appendChild(el("div", "v", v));
      wrap.appendChild(r);
    });

    node.appendChild(wrap);
  }

  function renderMoments(node, report, extraPills) {
    clear(node);
    const moments = Array.isArray(report?.moments) ? report.moments.slice() : [];

    // ordena por minuto (se houver)
    moments.sort((a, b) => n(a.minute, 0) - n(b.minute, 0));

    // se não tiver momentos, cria um resumo mínimo
    if (!moments.length) {
      moments.push({ minute: 90, type: "INFO", text: "Fim de jogo." });
    }

    const wrap = el("div", "pm-moments");

    // pills (status de copa/estadual etc.)
    if (Array.isArray(extraPills) && extraPills.length) {
      extraPills.forEach(p => {
        const pill = el("div", `pm-pill ${p.cls || ""}`, p.text);
        const m = el("div", "m");
        m.appendChild(el("div", "t", "INFO"));
        const d = el("div", "d");
        d.appendChild(pill);
        m.appendChild(d);
        wrap.appendChild(m);
      });
    }

    moments.slice(0, 18).forEach(m => {
      const row = el("div", "m");
      const t = el("div", "t", `${n(m.minute, 0)}'`);
      const d = el("div", "d", m.text || m.desc || "—");
      row.appendChild(t);
      row.appendChild(d);
      wrap.appendChild(row);
    });

    node.appendChild(wrap);
  }

  function leagueRoundResultsFallback(report) {
    // fallback simples e estável quando não temos resultados reais da rodada.
    // Mostra o jogo do usuário + placeholders.
    const res = [];
    res.push({
      homeId: report.homeId,
      awayId: report.awayId,
      gh: report.goalsHome,
      ga: report.goalsAway,
      isUser: true
    });

    // tenta gerar mais 5 placares de times aleatórios da mesma divisão
    const teams = getTeams().slice();
    if (teams.length >= 6) {
      for (let i = 0; i < 5; i++) {
        const a = teams[Math.floor(Math.random() * teams.length)];
        let b = teams[Math.floor(Math.random() * teams.length)];
        if (String(b.id) === String(a.id)) b = teams[(teams.indexOf(b) + 1) % teams.length];
        const gh = Math.max(0, Math.round((Math.random() + Math.random()) * 1.2));
        const ga = Math.max(0, Math.round((Math.random() + Math.random()) * 1.0));
        res.push({ homeId: a.id, awayId: b.id, gh, ga, isUser: false });
      }
    }

    return res;
  }

  function tryGetRoundResultsFromEngines(report) {
    // Como o League.processarRodadaComJogoDoUsuario já roda no fim do jogo,
    // ele pode ter salvo algo em gameState, ou não.
    // Tentamos capturar algo plausível, sem quebrar.
    try {
      if (window.gameState && Array.isArray(window.gameState.lastRoundResults)) {
        return window.gameState.lastRoundResults.map(x => ({
          homeId: x.homeId, awayId: x.awayId,
          gh: n(x.golsHome ?? x.gh, 0),
          ga: n(x.golsAway ?? x.ga, 0),
          isUser: false
        }));
      }
    } catch (e) {}

    // Se League tiver uma API dedicada (futuro), usa
    try {
      if (window.League && typeof League.getLastRoundResults === "function") {
        const arr = League.getLastRoundResults();
        if (Array.isArray(arr) && arr.length) {
          return arr.map(x => ({
            homeId: x.homeId, awayId: x.awayId,
            gh: n(x.golsHome ?? x.gh, 0),
            ga: n(x.golsAway ?? x.ga, 0),
            isUser: false
          }));
        }
      }
    } catch (e) {}

    return null;
  }

  function renderRoundResults(node, report) {
    clear(node);

    const comp = compLabel(report?.competition);
    if (comp !== "LEAGUE") {
      node.appendChild(el("div", "pm-muted", "Resultados de rodada só aparecem na Liga."));
      return;
    }

    let results = tryGetRoundResultsFromEngines(report);
    if (!results || !results.length) results = leagueRoundResultsFallback(report);

    // garante jogo do usuário no topo
    const userLine = {
      homeId: report.homeId,
      awayId: report.awayId,
      gh: report.goalsHome,
      ga: report.goalsAway,
      isUser: true
    };

    const rest = results.filter(r => !(String(r.homeId) === String(userLine.homeId) && String(r.awayId) === String(userLine.awayId)));
    const final = [userLine].concat(rest.slice(0, 9));

    const wrap = el("div", "pm-round-results");
    final.forEach(r => {
      const row = el("div", "rr");

      const left = el("div", "", teamName(r.homeId));
      const mid = el("div", "mid", `${n(r.gh, 0)} x ${n(r.ga, 0)}`);
      const right = el("div", "", teamName(r.awayId));

      if (r.isUser) {
        left.style.fontWeight = "1000";
        right.style.fontWeight = "1000";
      }

      row.appendChild(left);
      row.appendChild(mid);
      row.appendChild(right);

      wrap.appendChild(row);
    });

    node.appendChild(wrap);
  }

  function buildExtraPills(report) {
    const pills = [];
    const comp = compLabel(report?.competition);

    // Copa do Brasil status
    if (comp === "CUP") {
      try {
        if (window.Cup && typeof Cup.getStatus === "function") {
          const st = Cup.getStatus(window.gameState?.currentTeamId || window.gameState?.selectedTeamId || null);
          if (st?.champion) pills.push({ cls: "ok", text: "🏆 Copa do Brasil: CAMPEÃO" });
          else if (st?.eliminated) pills.push({ cls: "bad", text: `❌ Copa do Brasil: ELIMINADO (${st.phase || "—"})` });
          else if (st?.active) pills.push({ cls: "warn", text: `➡️ Copa do Brasil: Classificado • Próxima fase: ${st.phase || "—"}` });
        }
      } catch (e) {}
    }

    // Estaduais status
    if (comp === "REGIONAL") {
      try {
        if (window.Regionals && typeof Regionals.getStatus === "function") {
          const st = Regionals.getStatus(window.gameState?.currentTeamId || window.gameState?.selectedTeamId || null);
          if (st?.finished && st?.championId) pills.push({ cls: "ok", text: `🏆 Estadual (${st.uf || "—"}): Campeão ${st.championName || ""}`.trim() });
          else if (st?.active) pills.push({ cls: "warn", text: `📌 Estadual (${st.uf || "—"}): Rodada ${st.round || "—"}` });
        }
      } catch (e) {}
    }

    // Liga: mini-status FFP (se Contracts existir)
    if (comp === "LEAGUE") {
      try {
        const teamId = window.gameState?.currentTeamId || window.gameState?.selectedTeamId || null;
        if (teamId && window.Contracts && typeof Contracts.getWageCap === "function" && typeof Contracts.getWageUsed === "function") {
          const cap = n(Contracts.getWageCap(teamId), 0);
          const used = n(Contracts.getWageUsed(teamId), 0);
          if (cap > 0) {
            const pct = (used / cap) * 100;
            if (pct < 75) pills.push({ cls: "ok", text: `FFP OK • Folha ${used.toFixed(2)} / ${cap.toFixed(2)} mi` });
            else if (pct < 95) pills.push({ cls: "warn", text: `FFP ATENÇÃO • Folha ${used.toFixed(2)} / ${cap.toFixed(2)} mi` });
            else pills.push({ cls: "bad", text: `FFP ESTOURADO • Folha ${used.toFixed(2)} / ${cap.toFixed(2)} mi` });
          }
        }
      } catch (e) {}
    }

    return pills;
  }

  // -----------------------------
  // Render principal
  // -----------------------------
  function render(report) {
    injectCssOnce();

    // valida
    if (!report) report = {};
    const comp = compLabel(report.competition);
    const compName = report.competitionName || (comp === "LEAGUE" ? "Campeonato Brasileiro" : comp === "CUP" ? "Copa do Brasil" : comp === "REGIONAL" ? "Estadual" : "Partida");

    // Header top
    setText("pm-competition", compName);

    const roundText =
      (comp === "LEAGUE")
        ? (report.roundNumber ? `Rodada ${report.roundNumber}` : "Rodada —")
        : (comp === "CUP")
          ? (report.roundNumber ? `Fase ${report.roundNumber}` : "Fase —")
          : (comp === "REGIONAL")
            ? (report.roundNumber ? `Rodada ${report.roundNumber}` : "Rodada —")
            : "—";

    setText("pm-round", roundText);

    // Scoreboard
    setImg("pm-logo-home", report.homeId);
    setImg("pm-logo-away", report.awayId);

    setText("pm-home", teamName(report.homeId));
    setText("pm-away", teamName(report.awayId));

    setText("pm-gh", n(report.goalsHome, 0));
    setText("pm_ga", n(report.goalsAway, 0));

    // MOTM
    setText("pm-motm", report.motm || "—");

    // Stats
    const statsNode = document.getElementById("pm-stats");
    if (statsNode) renderStats(statsNode, report);

    // Moments + extras
    const momentsNode = document.getElementById("pm-moments");
    const pills = buildExtraPills(report);
    if (momentsNode) renderMoments(momentsNode, report, pills);

    // Round results
    const rrNode = document.getElementById("pm-round-results");
    if (rrNode) renderRoundResults(rrNode, report);

    // guarda último report
    try { window.lastMatchReport = JSON.parse(JSON.stringify(report)); } catch (e) { window.lastMatchReport = report; }
  }

  // -----------------------------
  // API pública
  // -----------------------------
  window.PostMatchUI = {
    render
  };
})();