/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/post-match-ui.js — Relatório Pós-Jogo AAA
   ======================================================= */

(function () {
  console.log("[POST-MATCH-UI] carregado");

  function $(id) { return document.getElementById(id); }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }

  function getTeamById(id) {
    return getTeams().find(t => t.id === id) || null;
  }

  function clear(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function rowStat(label, homeVal, awayVal) {
    const r = document.createElement("div");
    r.className = "pm-stat-row";

    const a = document.createElement("div");
    a.className = "pm-stat-home";
    a.textContent = String(homeVal);

    const b = document.createElement("div");
    b.className = "pm-stat-label";
    b.textContent = label;

    const c = document.createElement("div");
    c.className = "pm-stat-away";
    c.textContent = String(awayVal);

    r.appendChild(a);
    r.appendChild(b);
    r.appendChild(c);
    return r;
  }

  function matchLine(m) {
    // espera: {homeId, awayId, golsHome, golsAway} (regionals usam golsHome/golsAway)
    const home = getTeamById(m.homeId);
    const away = getTeamById(m.awayId);

    const line = document.createElement("div");
    line.className = "pm-match-line";

    const left = document.createElement("div");
    left.className = "pm-match-left";
    left.textContent = home?.name || m.homeId;

    const mid = document.createElement("div");
    mid.className = "pm-match-mid";
    const gh = (m.golsHome ?? m.goalsHome ?? 0);
    const ga = (m.golsAway ?? m.goalsAway ?? 0);
    mid.textContent = `${gh} x ${ga}`;

    const right = document.createElement("div");
    right.className = "pm-match-right";
    right.textContent = away?.name || m.awayId;

    line.appendChild(left);
    line.appendChild(mid);
    line.appendChild(right);
    return line;
  }

  function showTelaPosJogo() {
    if (typeof window.mostrarTela === "function") {
      window.mostrarTela("tela-pos-jogo");
      return;
    }
    // fallback simples
    document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
    const alvo = document.getElementById("tela-pos-jogo");
    if (alvo) alvo.classList.add("ativa");
  }

  function openReport(report) {
    if (!report) return;

    const home = getTeamById(report.homeId);
    const away = getTeamById(report.awayId);

    $("pm-competition").textContent = report.competitionName || "—";
    $("pm-round").textContent = report.roundLabel || "—";

    $("pm-home").textContent = home?.name || report.homeId;
    $("pm-away").textContent = away?.name || report.awayId;

    $("pm-gh").textContent = String(report.goalsHome ?? 0);
    $("pm_ga").textContent = String(report.goalsAway ?? 0);

    const logoHome = $("pm-logo-home");
    const logoAway = $("pm-logo-away");

    if (logoHome) {
      logoHome.src = `assets/logos/${report.homeId}.png`;
      logoHome.onerror = () => { logoHome.src = "assets/logos/default.png"; };
    }
    if (logoAway) {
      logoAway.src = `assets/logos/${report.awayId}.png`;
      logoAway.onerror = () => { logoAway.src = "assets/logos/default.png"; };
    }

    $("pm-motm").textContent = report.motmText || "—";

    // stats
    const statsEl = $("pm-stats");
    clear(statsEl);

    const s = report.stats || {};
    statsEl.appendChild(rowStat("POSSE", `${s.possessionHome ?? 50}%`, `${s.possessionAway ?? 50}%`));
    statsEl.appendChild(rowStat("CHUTES", s.shotsHome ?? 0, s.shotsAway ?? 0));
    statsEl.appendChild(rowStat("NO ALVO", s.shotsOnHome ?? 0, s.shotsOnAway ?? 0));
    statsEl.appendChild(rowStat("xG", (Number(s.xgHome ?? 0)).toFixed(2), (Number(s.xgAway ?? 0)).toFixed(2)));
    statsEl.appendChild(rowStat("ESCANTEIOS", s.cornersHome ?? 0, s.cornersAway ?? 0));
    statsEl.appendChild(rowStat("FALTAS", s.foulsHome ?? 0, s.foulsAway ?? 0));
    statsEl.appendChild(rowStat("AMARELOS", s.cardsHomeY ?? 0, s.cardsAwayY ?? 0));
    statsEl.appendChild(rowStat("VERMELHOS", s.cardsHomeR ?? 0, s.cardsAwayR ?? 0));

    // moments
    const momentsEl = $("pm-moments");
    clear(momentsEl);

    const moments = Array.isArray(report.moments) ? report.moments : [];
    if (!moments.length) {
      const d = document.createElement("div");
      d.className = "pm-muted";
      d.textContent = "Sem momentos-chave registrados.";
      momentsEl.appendChild(d);
    } else {
      moments.forEach(t => {
        const item = document.createElement("div");
        item.className = "pm-moment";
        item.textContent = t;
        momentsEl.appendChild(item);
      });
    }

    // round results (if any)
    const rrEl = $("pm-round-results");
    clear(rrEl);

    if (Array.isArray(report.roundResults) && report.roundResults.length) {
      report.roundResults.forEach(m => rrEl.appendChild(matchLine(m)));
    } else {
      const d = document.createElement("div");
      d.className = "pm-muted";
      d.textContent = "Sem resultados de rodada para exibir.";
      rrEl.appendChild(d);
    }

    // abre tela
    showTelaPosJogo();
  }

  window.PostMatchUI = {
    openReport
  };

  // Integra com UI global (se existir)
  window.UI = Object.assign(window.UI || {}, {
    abrirRelatorioPosJogo(report) {
      openReport(report);
    }
  });
})();