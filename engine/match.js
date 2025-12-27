/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/match.js — Partida AAA (Match Center + Integrações)
   -------------------------------------------------------
   Entrega:
   - Match._startMatch(homeId, awayId, ctx?)  -> inicia
   - Simulação em tempo real (cronômetro + eventos + estatísticas)
   - Ao finalizar:
     • envia resultado para League / Cup / Regionals
     • atualiza Fitness (fadiga + cartões + lesões leves)
     • chama PostMatchUI.render(report) se existir
     • gera notícias (se News existir)
     • salva (Save.salvar)

   Compatibilidade:
   - Mantém Match.substituicoes() como placeholder
   - Mantém Match.iniciarProximoJogo() como fallback antigo
   =======================================================*/

(function () {
  console.log("%c[Match] match.js AAA carregado", "color:#ef4444; font-weight:bold;");

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd() { return Math.random(); }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.match) gs.match = {};
    if (!gs.seasonYear) gs.seasonYear = 2026;
    return gs;
  }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }
  function getPlayers() {
    return (window.Database && Array.isArray(Database.players)) ? Database.players : [];
  }
  function getTeamById(id) {
    return getTeams().find(t => String(t.id) === String(id)) || null;
  }
  function teamName(id) {
    return getTeamById(id)?.name || String(id);
  }
  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  function save() {
    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}
  }
  function news(title, body, tag) {
    try { if (window.News && typeof News.pushNews === "function") News.pushNews(title, body, tag || "MATCH"); } catch (e) {}
  }

  // DOM ids do index
  const DOM = {
    telaPartida: "tela-partida",
    partidaHome: "partida-home",
    partidaAway: "partida-away",
    golsHome: "gols-home",
    golsAway: "gols-away",
    logoHome: "logo-home",
    logoAway: "logo-away",
    cronometro: "cronometro",
    logPartida: "log-partida",

    // Match Center
    posseHome: "mc-posse-home",
    posseAway: "mc-posse-away",
    chutesHome: "mc-chutes-home",
    chutesAway: "mc-chutes-away",
    alvoHome: "mc-alvo-home",
    alvoAway: "mc-alvo-away",
    xgHome: "mc-xg-home",
    xgAway: "mc-xg-away",
    escHome: "mc-esc-home",
    escAway: "mc-esc-away",
    faltasHome: "mc-faltas-home",
    faltasAway: "mc-faltas-away"
  };

  function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(txt);
  }
  function setImg(id, src, fallback) {
    const el = document.getElementById(id);
    if (!el) return;
    el.src = src;
    el.onerror = () => { el.src = fallback || ""; };
  }
  function pushLog(msg) {
    const box = document.getElementById(DOM.logPartida);
    if (!box) return;
    const div = document.createElement("div");
    div.className = "log-row";
    div.textContent = msg;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  }
  function clearLog() {
    const box = document.getElementById(DOM.logPartida);
    if (box) box.innerHTML = "";
  }

  // -----------------------------
  // Elencos (usa titulares se existirem)
  // -----------------------------
  function getTeamPlayers(teamId) {
    return getPlayers().filter(p => String(p.teamId) === String(teamId));
  }

  function getTitulares(teamId) {
    const gs = ensureGS();
    const t = Array.isArray(gs.titulares) ? gs.titulares : [];
    const ids = t.map(x => String(x?.playerId || x?.id || x)).filter(Boolean);

    const teamPlayers = getTeamPlayers(teamId);
    if (ids.length >= 11) {
      const chosen = ids.map(id => teamPlayers.find(p => String(p.id) === String(id))).filter(Boolean);
      if (chosen.length >= 11) return chosen.slice(0, 11);
    }

    // fallback: top 11 por OVR
    const arr = teamPlayers.slice();
    arr.sort((a, b) => n(b.ovr ?? b.overall, 0) - n(a.ovr ?? a.overall, 0));
    return arr.slice(0, 11);
  }

  function teamStrength(players) {
    if (!players || !players.length) return 50;
    const avg = players.reduce((s, p) => s + n(p.ovr ?? p.overall, 60), 0) / players.length;
    return clamp(avg, 30, 95);
  }

  // -----------------------------
  // Fitness (opcional)
  // -----------------------------
  function fitnessEnsure(pid) {
    try { if (window.Fitness && typeof Fitness.ensurePlayer === "function") return Fitness.ensurePlayer(pid); } catch (e) {}
    return { fatigue: 10, injuryWeeks: 0, suspended: false, yellowCards: 0 };
  }

  function fitnessApplyAfterMatch(teamPlayers, minutesPlayed, opts) {
    // opts: { userTeam:boolean }
    const baseFatigue = clamp(30 + (minutesPlayed * 0.35), 40, 80);

    for (const p of teamPlayers) {
      const f = fitnessEnsure(p.id);

      // aumenta fadiga
      f.fatigue = clamp(n(f.fatigue, 0) + baseFatigue * (0.65 + rnd() * 0.35), 0, 100);

      // chance de cartão amarelo/lesão leve
      const yellowChance = 0.08 + rnd() * 0.08;
      const injuryChance = 0.015 + rnd() * 0.02;

      if (rnd() < yellowChance) {
        f.yellowCards = clamp(n(f.yellowCards, 0) + 1, 0, 5);
      }

      if (rnd() < injuryChance) {
        // lesão 1-4 semanas
        const weeks = 1 + Math.floor(rnd() * 4);
        f.injuryWeeks = Math.max(n(f.injuryWeeks, 0), weeks);
      }

      // salva de volta se Fitness tiver setter
      try { if (window.Fitness && typeof Fitness.setPlayer === "function") Fitness.setPlayer(p.id, f); } catch (e) {}
    }

    // suspensões por amarelo (modelo simples)
    try {
      if (window.Fitness && typeof Fitness.applyDisciplinaryRules === "function") {
        Fitness.applyDisciplinaryRules();
      }
    } catch (e) {}
  }

  // -----------------------------
  // Engine do Match (state)
  // -----------------------------
  const state = {
    running: false,
    minute: 0,
    intervalDone: false,

    homeId: null,
    awayId: null,
    ctx: null,

    // stats
    gh: 0,
    ga: 0,
    possH: 50,
    possA: 50,
    shotsH: 0,
    shotsA: 0,
    onH: 0,
    onA: 0,
    xgH: 0,
    xgA: 0,
    cornersH: 0,
    cornersA: 0,
    foulsH: 0,
    foulsA: 0,

    // events
    moments: [], // {minute, type, text}
    motm: null,

    tickTimer: null
  };

  function resetState() {
    state.running = false;
    state.minute = 0;
    state.intervalDone = false;

    state.gh = 0; state.ga = 0;
    state.possH = 50; state.possA = 50;
    state.shotsH = 0; state.shotsA = 0;
    state.onH = 0; state.onA = 0;
    state.xgH = 0; state.xgA = 0;
    state.cornersH = 0; state.cornersA = 0;
    state.foulsH = 0; state.foulsA = 0;

    state.moments = [];
    state.motm = null;

    if (state.tickTimer) {
      clearInterval(state.tickTimer);
      state.tickTimer = null;
    }
  }

  function renderHeader() {
    setText(DOM.partidaHome, teamName(state.homeId));
    setText(DOM.partidaAway, teamName(state.awayId));
    setText(DOM.golsHome, state.gh);
    setText(DOM.golsAway, state.ga);

    setImg(DOM.logoHome, `assets/logos/${state.homeId}.png`, "assets/logos/default.png");
    setImg(DOM.logoAway, `assets/logos/${state.awayId}.png`, "assets/logos/default.png");

    setText(DOM.cronometro, `${state.minute}'`);
  }

  function renderStats() {
    setText(DOM.posseHome, `${Math.round(state.possH)}%`);
    setText(DOM.posseAway, `${Math.round(state.possA)}%`);
    setText(DOM.chutesHome, state.shotsH);
    setText(DOM.chutesAway, state.shotsA);
    setText(DOM.alvoHome, state.onH);
    setText(DOM.alvoAway, state.onA);
    setText(DOM.xgHome, state.xgH.toFixed(2));
    setText(DOM.xgAway, state.xgA.toFixed(2));
    setText(DOM.escHome, state.cornersH);
    setText(DOM.escAway, state.cornersA);
    setText(DOM.faltasHome, state.foulsH);
    setText(DOM.faltasAway, state.foulsA);
  }

  function logMoment(type, minute, text) {
    const msg = `${minute}' ${text}`;
    state.moments.push({ type, minute, text });
    pushLog(msg);
  }

  // -----------------------------
  // Simulação (tick)
  // -----------------------------
  function computeChances() {
    const home11 = getTitulares(state.homeId);
    const away11 = getTitulares(state.awayId);

    // força bruta
    const sh = teamStrength(home11);
    const sa = teamStrength(away11);

    // mando
    const homeBoost = 3.5;

    // base chance por minuto
    const base = 0.06; // chance de "momento"

    // peso por força
    const total = (sh + sa + homeBoost);
    const pHome = clamp((sh + homeBoost) / total, 0.35, 0.65);

    return { pMoment: base, pHome };
  }

  function attemptShot(isHome) {
    if (isHome) state.shotsH += 1; else state.shotsA += 1;

    // no alvo?
    const onTarget = rnd() < (isHome ? 0.38 : 0.34);
    if (onTarget) {
      if (isHome) state.onH += 1; else state.onA += 1;
    }

    // xG
    const xg = clamp(0.03 + rnd() * 0.22, 0.02, 0.35);
    if (isHome) state.xgH += xg; else state.xgA += xg;

    // gol?
    const goalChance = clamp(xg * (onTarget ? 1.15 : 0.55), 0.01, 0.45);
    const goal = rnd() < goalChance;

    return { onTarget, xg, goal };
  }

  function randomPlayerName(teamId) {
    const roster = getTeamPlayers(teamId);
    if (!roster.length) return "Jogador";
    const top = roster.slice().sort((a, b) => n(b.ovr ?? b.overall, 0) - n(a.ovr ?? a.overall, 0)).slice(0, 14);
    const p = pick(top.length ? top : roster);
    return p?.name || p?.nome || `Jogador ${p?.id || ""}`.trim();
  }

  function tick() {
    if (!state.running) return;

    state.minute += 1;

    // intervalo
    if (state.minute === 45) {
      logMoment("INFO", 45, "⏸ Intervalo. Ajuste táticas se quiser.");
      state.intervalDone = true;
      // pausa curta para o usuário (simples)
    }

    // fim
    if (state.minute >= 90) {
      finalizeMatch();
      return;
    }

    // variação posse
    const drift = (rnd() - 0.5) * 2.2;
    state.possH = clamp(state.possH + drift, 35, 65);
    state.possA = 100 - state.possH;

    // faltas e escanteios
    if (rnd() < 0.12) { state.foulsH += (rnd() < 0.5 ? 1 : 0); state.foulsA += (rnd() < 0.5 ? 1 : 0); }
    if (rnd() < 0.06) { if (rnd() < 0.5) state.cornersH++; else state.cornersA++; }

    // momento
    const ch = computeChances();
    if (rnd() < ch.pMoment) {
      const isHome = rnd() < ch.pHome;
      const shooter = randomPlayerName(isHome ? state.homeId : state.awayId);

      const shot = attemptShot(isHome);
      if (shot.goal) {
        if (isHome) state.gh += 1; else state.ga += 1;
        logMoment("GOAL", state.minute, `⚽ GOL! ${shooter} (${isHome ? teamName(state.homeId) : teamName(state.awayId)})`);
      } else if (shot.onTarget) {
        logMoment("SHOT", state.minute, `🧤 Defesa do goleiro! Finalização de ${shooter}`);
      } else {
        logMoment("SHOT", state.minute, `🥅 Finalização pra fora: ${shooter}`);
      }
    }

    // atualiza DOM
    renderHeader();
    renderStats();
  }

  // -----------------------------
  // Finalização + Integrações (Liga/Copa/Estaduais)
  // -----------------------------
  function buildReport() {
    const ctx = state.ctx || window.currentMatchContext || {};
    const comp = String(ctx.competition || ctx.comp || "LEAGUE").toUpperCase();

    // MOTM (modelo simples: time vencedor)
    let motm = "—";
    if (state.gh !== state.ga) {
      const winner = (state.gh > state.ga) ? state.homeId : state.awayId;
      motm = randomPlayerName(winner);
    } else {
      motm = randomPlayerName(state.homeId);
    }

    const report = {
      date: ctx.date || null,
      competition: comp,
      competitionName: ctx.competitionName || ctx.title || (comp === "LEAGUE" ? "Campeonato Brasileiro" : comp === "CUP" ? "Copa do Brasil" : comp === "REGIONAL" ? "Estadual" : "Partida"),
      roundNumber: ctx.roundNumber || ctx.round || null,
      division: ctx.division || null,

      homeId: state.homeId,
      awayId: state.awayId,
      goalsHome: state.gh,
      goalsAway: state.ga,

      stats: {
        posseHome: Math.round(state.possH),
        posseAway: Math.round(state.possA),
        chutesHome: state.shotsH,
        chutesAway: state.shotsA,
        alvoHome: state.onH,
        alvoAway: state.onA,
        xgHome: Number(state.xgH.toFixed(2)),
        xgAway: Number(state.xgA.toFixed(2)),
        escanteiosHome: state.cornersH,
        escanteiosAway: state.cornersA,
        faltasHome: state.foulsH,
        faltasAway: state.foulsA
      },

      moments: state.moments.slice(),
      motm
    };

    return report;
  }

  function routeResultToCompetitions(report) {
    const comp = String(report.competition || "LEAGUE").toUpperCase();

    // Liga
    if (comp === "LEAGUE") {
      try {
        if (window.League && typeof League.processarRodadaComJogoDoUsuario === "function") {
          League.processarRodadaComJogoDoUsuario(report.homeId, report.awayId, report.goalsHome, report.goalsAway);
        }
      } catch (e) {
        console.warn("[Match] erro ao processar liga:", e);
      }
      return;
    }

    // Copa do Brasil
    if (comp === "CUP") {
      try {
        if (window.Cup && typeof Cup.applyUserMatchResult === "function") {
          Cup.applyUserMatchResult({
            teamId: getUserTeamId(),
            homeId: report.homeId,
            awayId: report.awayId,
            goalsHome: report.goalsHome,
            goalsAway: report.goalsAway
          });
        }
      } catch (e) {
        console.warn("[Match] erro ao processar copa:", e);
      }
      return;
    }

    // Estaduais
    if (comp === "REGIONAL") {
      try {
        if (window.Regionals && typeof Regionals.applyUserMatchResult === "function") {
          Regionals.applyUserMatchResult({
            teamId: getUserTeamId(),
            homeId: report.homeId,
            awayId: report.awayId,
            goalsHome: report.goalsHome,
            goalsAway: report.goalsAway
          });
        }
      } catch (e) {
        console.warn("[Match] erro ao processar estadual:", e);
      }
      return;
    }
  }

  function finalizeMatch() {
    state.running = false;
    if (state.tickTimer) {
      clearInterval(state.tickTimer);
      state.tickTimer = null;
    }

    logMoment("INFO", 90, "⏱ Fim de jogo!");

    const report = buildReport();

    // Fitness pós-jogo (somente nos times que jogaram)
    try {
      const homeRoster = getTitulares(report.homeId);
      const awayRoster = getTitulares(report.awayId);
      fitnessApplyAfterMatch(homeRoster, 90, {});
      fitnessApplyAfterMatch(awayRoster, 90, {});
    } catch (e) {}

    // rota resultado para engine correto
    routeResultToCompetitions(report);

    // notícia
    const title = `${report.competitionName}`;
    const body = `${teamName(report.homeId)} ${report.goalsHome} x ${report.goalsAway} ${teamName(report.awayId)}`;
    const tag = report.competition === "LEAGUE" ? "LEAGUE" : report.competition;
    news(title, body, tag);

    save();

    // Pós-jogo AAA
    try {
      if (window.PostMatchUI && typeof PostMatchUI.render === "function") {
        PostMatchUI.render(report);
        // UI deve mudar tela, mas se não fizer, tentamos:
        try { if (window.UI && typeof UI.mostrarTelaPosJogo === "function") UI.mostrarTelaPosJogo(); } catch (e) {}
        if (window.UI && typeof UI.voltarLobby === "function") {
          // se PostMatchUI só renderiza e não troca tela, a UI.js do projeto já tem "tela-pos-jogo"
          const tp = document.getElementById("tela-pos-jogo");
          if (tp) {
            document.querySelectorAll(".tela").forEach((t) => t.classList.remove("ativa"));
            tp.classList.add("ativa");
          }
        }
        return;
      }
    } catch (e) {}

    // fallback: volta para lobby
    try { if (window.UI && typeof UI.voltarLobby === "function") UI.voltarLobby(); } catch (e) {}
  }

  // -----------------------------
  // Public API
  // -----------------------------
  function _startMatch(homeId, awayId, ctx) {
    ensureGS();
    resetState();

    state.homeId = String(homeId);
    state.awayId = String(awayId);

    // contexto
    state.ctx = Object.assign({}, (ctx || window.currentMatchContext || {}));
    if (!state.ctx.competition && state.ctx.comp) state.ctx.competition = state.ctx.comp;

    // escreve contexto global também (para outros engines)
    window.currentMatchContext = Object.assign({}, state.ctx);

    // renderiza e inicia
    clearLog();
    renderHeader();
    renderStats();

    // anúncio
    const compName = state.ctx.competitionName || state.ctx.title || "Partida";
    pushLog(`🏟 ${compName}`);
    if (state.ctx.date) pushLog(`📅 ${state.ctx.date}`);

    state.running = true;
    state.tickTimer = setInterval(tick, 650); // velocidade do match
  }

  function iniciarProximoJogo() {
    // fallback: usa League.prepararProximoJogo
    try {
      if (window.League && typeof League.prepararProximoJogo === "function") {
        const fx = League.prepararProximoJogo();
        if (!fx) { alert("Sem próximo jogo."); return; }
        window.currentMatchContext = {
          competition: "LEAGUE",
          competitionName: fx.competitionName || "Campeonato Brasileiro",
          roundNumber: fx.roundNumber || fx.round || null,
          division: fx.division || null,
          date: fx.date || null
        };
        _startMatch(fx.homeId, fx.awayId, window.currentMatchContext);
        return;
      }
    } catch (e) {}

    alert("Não foi possível iniciar o próximo jogo.");
  }

  function substituicoes() {
    alert("Substituições: em breve (AAA).");
  }

  window.Match = {
    _startMatch,
    iniciarProximoJogo,
    substituicoes
  };
})();