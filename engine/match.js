/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/match.js — Match Engine v7 (AAA)
   -------------------------------------------------------
   Integrações:
   - Fitness (lesões, suspensões, fadiga):
     * impede jogador lesionado/suspenso de ser usado
     * aplica carga de jogo (fatigue) por minutos
     * distribui cartões e marca suspensão
     * gera lesão em evento (injuryWeeks) persistente
   - Contracts:
     * chama Contracts.onUserMatchFinished() ao fim do jogo do usuário

   UI:
   - Atualiza placar, cronômetro, log e Match Center (se existir)

   Compatível com:
   - League.processarRodadaComJogoDoUsuario(...)
   - UI.abrirRelatorioPosJogo(report) / PostMatchUI.openReport(report)
   =======================================================*/

(function () {
  console.log("%c[Match] match.js v7 carregado", "color:#22c55e; font-weight:bold;");

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function rnd() { return Math.random(); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    if (!window.gameState.matchSpeedMs) window.gameState.matchSpeedMs = 600; // pode ajustar
    return window.gameState;
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

  function getTeamPlayers(teamId) {
    return getPlayers().filter(p => String(p.teamId) === String(teamId));
  }

  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  function getUserFormation() {
    if (window.Game && Game.formacao) return String(Game.formacao);
    if (window.gameState && gameState.formacao) return String(gameState.formacao);
    return null;
  }

  function parseFormation(form) {
    if (!form || typeof form !== "string") return { def: 4, mid: 4, att: 2 };
    const parts = form.split("-").map(x => parseInt(x, 10)).filter(x => !isNaN(x));
    if (parts.length < 3) return { def: 4, mid: 4, att: 2 };
    return { def: parts[0], mid: parts[1], att: parts[2] };
  }

  function formatMinute(min) {
    if (min <= 90) return `${min}'`;
    return `90+${min - 90}'`;
  }

  // Fitness helpers
  function canPlayPlayer(p) {
    try {
      if (window.Fitness && typeof Fitness.isAvailable === "function") {
        return Fitness.isAvailable(p.id);
      }
    } catch (e) {}
    return true;
  }

  function ensureFitnessPlayer(pid) {
    try {
      if (window.Fitness && typeof Fitness.ensurePlayer === "function") return Fitness.ensurePlayer(pid);
    } catch (e) {}
    return null;
  }

  function applyInjuryWeeks(pid, weeks) {
    const f = ensureFitnessPlayer(pid);
    if (!f) return;
    f.injuryWeeks = clamp(n(weeks, 1), 1, 26);
  }

  function applyMatchLoad(pid, minutes) {
    try {
      if (window.Fitness && typeof Fitness.applyMatchLoad === "function") {
        Fitness.applyMatchLoad(pid, minutes);
      }
    } catch (e) {}
  }

  function giveYellow(pid) {
    try {
      if (window.Fitness && typeof Fitness.giveYellow === "function") Fitness.giveYellow(pid);
    } catch (e) {}
  }

  function giveRed(pid) {
    try {
      if (window.Fitness && typeof Fitness.giveRed === "function") Fitness.giveRed(pid);
    } catch (e) {}
  }

  // Power calculation
  function computeSquadStrength(teamId, preferUserTitulares) {
    const raw = getTeamPlayers(teamId);
    const eligible = raw.filter(canPlayPlayer);

    if (!eligible.length) {
      return { atk: 62, mid: 62, def: 62, gk: 62, ovr: 62, sample: [] };
    }

    let sample = [];

    // titulares do usuário (se existirem) – filtrados por disponibilidade
    if (preferUserTitulares && window.gameState && Array.isArray(gameState.titulares) && gameState.titulares.length) {
      const ids = gameState.titulares.map(x => x?.playerId || x?.id || x).filter(Boolean).map(String);
      const chosen = ids.map(pid => eligible.find(p => String(p.id) === pid)).filter(Boolean);
      if (chosen.length >= 8) sample = chosen.slice(0, 11);
    }

    // fallback: top 11 por OVR
    if (!sample.length) {
      const sorted = eligible.slice().sort((a, b) => n(b.ovr ?? b.overall, 0) - n(a.ovr ?? a.overall, 0));
      sample = sorted.slice(0, Math.min(11, sorted.length));
    }

    const pos = (p) => String(p.pos || p.position || "").toUpperCase();

    let gk = [], defs = [], mids = [], atks = [];
    for (const p of sample) {
      const ps = pos(p);
      if (ps.includes("GOL") || ps === "GK") gk.push(p);
      else if (ps.includes("ZAG") || ps.includes("LD") || ps.includes("LE") || ps.includes("DEF") || ps.includes("RB") || ps.includes("LB") || ps.includes("CB")) defs.push(p);
      else if (ps.includes("VOL") || ps.includes("MEI") || ps.includes("MID") || ps.includes("CM") || ps.includes("DM") || ps.includes("AM")) mids.push(p);
      else if (ps.includes("ATA") || ps.includes("PON") || ps.includes("ST") || ps.includes("FW") || ps.includes("W")) atks.push(p);
      else mids.push(p);
    }

    function avg(list, fallback = 65) {
      if (!list.length) return fallback;
      const vals = list.map(p => n(p.ovr ?? p.overall, fallback));
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    }

    const atk = avg(atks.length ? atks : sample.slice(0, 3), 64);
    const mid = avg(mids.length ? mids : sample.slice(3, 7), 64);
    const def = avg(defs.length ? defs : sample.slice(7, 10), 64);
    const gkV = avg(gk.length ? gk : sample.slice(0, 1), 64);
    const ovr = avg(sample, 64);

    return { atk, mid, def, gk: gkV, ovr, sample };
  }

  function computePossessionBias(homePow, awayPow, homeForm, awayForm) {
    const hf = parseFormation(homeForm);
    const af = parseFormation(awayForm);
    const homeMidFactor = (homePow.mid - awayPow.mid) / 30;
    const homeMidCountFactor = (hf.mid - af.mid) / 10;
    return clamp(0.50 + homeMidFactor * 0.12 + homeMidCountFactor * 0.06, 0.35, 0.65);
  }

  function chanceXg(isBig) {
    return isBig ? clamp(0.28 + rnd() * 0.35, 0.22, 0.70) : clamp(0.03 + rnd() * 0.17, 0.02, 0.25);
  }

  function goalProb(att, def, gk, isBig) {
    const base = isBig ? 0.22 : 0.08;
    const attFactor = (att - 60) / 100;
    const resFactor = ((def + gk) / 2 - 60) / 120;
    return clamp(base + attFactor * 0.18 - resFactor * 0.16 + (rnd() - 0.5) * 0.04, 0.03, 0.45);
  }

  // Match Center update (se UI existir)
  function updateMatchCenter(state) {
    // ids: mc-posse-home, mc-posse-away, mc-chutes-home, mc-chutes-away, mc-alvo-home, mc-alvo-away, mc-xg-home, mc-xg-away, mc-esc-home, mc-esc-away, mc-faltas-home, mc-faltas-away
    const s = state.stats;

    const h = s.home.possessionTicks;
    const a = s.away.possessionTicks;
    const total = h + a;
    const pHome = total ? Math.round((h / total) * 100) : 50;
    const pAway = 100 - pHome;

    function set(id, txt) {
      const el = document.getElementById(id);
      if (el) el.textContent = txt;
    }

    set("mc-posse-home", `${pHome}%`);
    set("mc-posse-away", `${pAway}%`);

    set("mc-chutes-home", String(s.home.shots));
    set("mc-chutes-away", String(s.away.shots));

    set("mc-alvo-home", String(s.home.shotsOn));
    set("mc-alvo-away", String(s.away.shotsOn));

    set("mc-xg-home", (s.home.xg).toFixed(2));
    set("mc-xg-away", (s.away.xg).toFixed(2));

    set("mc-esc-home", String(s.home.corners));
    set("mc-esc-away", String(s.away.corners));

    set("mc-faltas-home", String(s.home.fouls));
    set("mc-faltas-away", String(s.away.fouls));
  }

  // -------------------------------------------------------
  // MAIN OBJECT
  // -------------------------------------------------------
  window.Match = {
    state: null,
    timer: null,

    iniciarProximoJogo() {
      ensureGS();

      // garante módulos
      try { if (window.Dynamics && typeof Dynamics.ensure === "function") Dynamics.ensure(); } catch (e) {}
      try { if (window.News && typeof News.ensure === "function") News.ensure(); } catch (e) {}
      try { if (window.Contracts && typeof Contracts.ensure === "function") Contracts.ensure(); } catch (e) {}
      try { if (window.Fitness && typeof Fitness.ensurePlayer === "function") { /* ok */ } } catch (e) {}

      const userTeamId = getUserTeamId();
      if (!userTeamId) { alert("Nenhum time selecionado."); return; }

      const userTeam = getTeamById(userTeamId);
      if (!userTeam) { alert("Time não encontrado."); return; }

      const div = userTeam.division || userTeam.league || "A";
      const teams = getTeams();
      const candidates = teams.filter(t => t.id !== userTeamId && (t.division || t.league || "A") === div);
      const away = candidates.length ? pick(candidates) : pick(teams.filter(t => t.id !== userTeamId));
      const home = userTeam;

      this._startMatch(home.id, away.id, { competition: "FRIENDLY", competitionName: "Amistoso" });
    },

    finalizarPartida() { this._finish(); },

    _setupUI(home, away) {
      const elHome = document.getElementById("partida-home");
      const elAway = document.getElementById("partida-away");
      const logoHome = document.getElementById("logo-home");
      const logoAway = document.getElementById("logo-away");
      const golsHome = document.getElementById("gols-home");
      const golsAway = document.getElementById("gols-away");
      const cron = document.getElementById("cronometro");
      const log = document.getElementById("log-partida");

      if (elHome) elHome.textContent = home?.name || "Casa";
      if (elAway) elAway.textContent = away?.name || "Visitante";

      if (logoHome) {
        logoHome.src = `assets/logos/${home?.id}.png`;
        logoHome.onerror = () => { logoHome.src = "assets/logos/default.png"; };
      }
      if (logoAway) {
        logoAway.src = `assets/logos/${away?.id}.png`;
        logoAway.onerror = () => { logoAway.src = "assets/logos/default.png"; };
      }

      if (golsHome) golsHome.textContent = "0";
      if (golsAway) golsAway.textContent = "0";
      if (cron) cron.textContent = "0'";
      if (log) log.innerHTML = "";
    },

    _startMatch(homeId, awayId, context) {
      ensureGS();

      // salva contexto global
      if (context && typeof context === "object") {
        window.currentMatchContext = Object.assign({}, window.currentMatchContext || {}, context);
      }

      const homeTeam = getTeamById(homeId) || { id: homeId, name: homeId };
      const awayTeam = getTeamById(awayId) || { id: awayId, name: awayId };

      const userTeamId = getUserTeamId();
      const isUserHome = userTeamId && String(userTeamId) === String(homeId);
      const isUserAway = userTeamId && String(userTeamId) === String(awayId);

      const homeForm = (isUserHome ? getUserFormation() : null) || "4-4-2";
      const awayForm = (isUserAway ? getUserFormation() : null) || "4-4-2";

      const homePow = computeSquadStrength(homeId, isUserHome);
      const awayPow = computeSquadStrength(awayId, isUserAway);

      const possBiasHome = computePossessionBias(homePow, awayPow, homeForm, awayForm);

      // se for jogo do usuário e não tem 11 disponíveis, avisa
      if (userTeamId && (isUserHome || isUserAway)) {
        const myPow = isUserHome ? homePow : awayPow;
        if (myPow.sample.length < 11) {
          this._log(`🚨 Atenção: você tem poucos jogadores disponíveis (lesões/suspensões).`);
        }
      }

      this.state = {
        homeId, awayId,
        minute: 0,
        endMinute: 90,
        finished: false,
        halftimeDone: false,

        goalsHome: 0,
        goalsAway: 0,

        homeForm, awayForm,
        homePow, awayPow,
        possBiasHome,

        played: {
          home: homePow.sample.map(p => p.id).filter(Boolean),
          away: awayPow.sample.map(p => p.id).filter(Boolean),
        },

        // por realismo: guardamos minutos jogados (AAA)
        minutesPlayed: {},

        // cartões e lesões (eventos)
        cards: { home: { y: 0, r: 0 }, away: { y: 0, r: 0 } },
        injuries: [],

        stats: {
          home: { possessionTicks: 0, shots: 0, shotsOn: 0, corners: 0, fouls: 0, xg: 0 },
          away: { possessionTicks: 0, shots: 0, shotsOn: 0, corners: 0, fouls: 0, xg: 0 }
        },

        best: { team: null, note: 6.0, reason: "" },

        events: []
      };

      // init minutesPlayed = 0
      for (const pid of this.state.played.home) this.state.minutesPlayed[String(pid)] = 0;
      for (const pid of this.state.played.away) this.state.minutesPlayed[String(pid)] = 0;

      this._setupUI(homeTeam, awayTeam);

      const parts = [];
      if (window.currentMatchContext?.competitionName) parts.push(window.currentMatchContext.competitionName);
      if (window.currentMatchContext?.division) parts.push(`Divisão ${window.currentMatchContext.division}`);
      if (window.currentMatchContext?.roundNumber) parts.push(`Rodada ${window.currentMatchContext.roundNumber}`);
      if (parts.length) this._log(`🏟️ ${parts.join(" • ")}`);

      this._log("Bola rolando!");
      this._startLoop();
    },

    _startLoop() {
      this._stopLoop();
      const speed = n(ensureGS().matchSpeedMs, 600);

      this.timer = setInterval(() => {
        if (!this.state || this.state.finished) return;

        this.state.minute += 1;

        // minutes played for used players
        for (const pid of this.state.played.home) this.state.minutesPlayed[String(pid)] += 1;
        for (const pid of this.state.played.away) this.state.minutesPlayed[String(pid)] += 1;

        const cron = document.getElementById("cronometro");
        if (cron) cron.textContent = formatMinute(this.state.minute);

        this._tickPossession();
        this._processMinute();

        const golsHome = document.getElementById("gols-home");
        const golsAway = document.getElementById("gols-away");
        if (golsHome) golsHome.textContent = String(this.state.goalsHome);
        if (golsAway) golsAway.textContent = String(this.state.goalsAway);

        updateMatchCenter(this.state);

        // intervalo
        if (this.state.minute >= 45 && !this.state.halftimeDone) {
          this.state.halftimeDone = true;
          this._halftime();
          return;
        }

        // extra time
        if (this.state.minute >= 90) {
          if (!this.state._extraSet) {
            this.state._extraSet = true;
            this.state.endMinute = 90 + this._estimateExtra();
          }
          if (this.state.minute >= this.state.endMinute) {
            this.finalizarPartida();
          }
        }
      }, speed);
    },

    _stopLoop() {
      if (this.timer) { clearInterval(this.timer); this.timer = null; }
    },

    _tickPossession() {
      const homeHas = rnd() < this.state.possBiasHome;
      if (homeHas) this.state.stats.home.possessionTicks++;
      else this.state.stats.away.possessionTicks++;
    },

    _estimateExtra() {
      const cards = this.state.cards.home.y + this.state.cards.away.y + (this.state.cards.home.r * 2) + (this.state.cards.away.r * 2);
      const inj = this.state.injuries.length;
      const goals = this.state.goalsHome + this.state.goalsAway;
      const base = 2;
      const add = clamp(Math.floor(goals * 0.6 + cards * 0.35 + inj * 1.2 + rnd() * 2), 0, 6);
      return clamp(base + add, 2, 6);
    },

    _halftime() {
      this._stopLoop();
      this._log("⏸️ Intervalo!");

      const s = this.state.stats;
      const pHome = this._possessionPct("home");
      const pAway = 100 - pHome;
      this._log(`📊 Intervalo: Posse ${pHome}% x ${pAway}% | Chutes ${s.home.shots} x ${s.away.shots} | xG ${s.home.xg.toFixed(2)} x ${s.away.xg.toFixed(2)}`);

      setTimeout(() => {
        const quer = confirm("Intervalo! Deseja ajustar táticas/escalação?");
        if (quer && window.UI && typeof UI.abrirTaticas === "function") {
          UI.abrirTaticas();
        } else {
          this._log("Recomeça a partida!");
          this._startLoop();
        }
      }, 50);
    },

    _processMinute() {
      const minute = this.state.minute;
      const tempoFactor = minute < 45 ? 0.90 : 1.05;

      if (rnd() < 0.10 * tempoFactor) this._attack();
      if (rnd() < 0.05 * tempoFactor && minute > 10) this._attack(true);

      if (rnd() < 0.06 * tempoFactor) this._foul();
      if (rnd() < 0.035 * tempoFactor) this._corner();
      if (rnd() < 0.006 * tempoFactor) this._injuryEvent();

      if (rnd() < 0.02) {
        const which = rnd() < this.state.possBiasHome ? "home" : "away";
        this._log(which === "home" ? "O time da casa troca passes e pressiona." : "O visitante encaixa uma boa sequência e avança no campo.");
      }
    },

    _attack(isBigForced) {
      const homeHas = rnd() < this.state.possBiasHome;
      const atkTeam = homeHas ? "home" : "away";
      const defTeam = homeHas ? "away" : "home";

      const atkPow = atkTeam === "home" ? this.state.homePow : this.state.awayPow;
      const defPow = defTeam === "home" ? this.state.homePow : this.state.awayPow;

      const isBig = !!isBigForced || (rnd() < (0.20 + (atkPow.atk - defPow.def) / 220));
      const xg = chanceXg(isBig);

      const stAtk = this.state.stats[atkTeam];
      stAtk.shots += 1;
      stAtk.xg += xg;

      const onTargetBase = isBig ? 0.55 : 0.32;
      const onTarget = rnd() < clamp(onTargetBase + (atkPow.atk - defPow.def) / 160, 0.18, 0.75);
      if (onTarget) stAtk.shotsOn += 1;

      const prob = goalProb(atkPow.atk, defPow.def, defPow.gk, isBig);
      const isGoal = onTarget && (rnd() < prob);

      const minTxt = formatMinute(this.state.minute);

      if (isGoal) {
        if (atkTeam === "home") this.state.goalsHome += 1;
        else this.state.goalsAway += 1;

        this._updateBest(atkTeam, isBig ? 8.4 : 7.8, "Gol importante");

        const msgs = [`⚽ ${minTxt} GOOOOOL!`, `⚽ ${minTxt} Bola na rede!`, `⚽ ${minTxt} É GOL!`];
        this._log(`${pick(msgs)} (${atkTeam === "home" ? "Casa" : "Visitante"})`);
        if (isBig) this._log("Foi uma chance claríssima, finalização perfeita!");
        return;
      }

      if (onTarget) {
        this._updateBest(defTeam, 7.4, "Boa defesa do goleiro");
        const save = [`🧤 ${minTxt} DEFESA do goleiro!`, `🧤 ${minTxt} O goleiro espalma!`, `🧤 ${minTxt} Grande defesa!`];
        this._log(`${pick(save)} (xG ${xg.toFixed(2)})`);
      } else {
        const miss = [`🎯 ${minTxt} Finaliza por cima!`, `🎯 ${minTxt} Chute para fora!`, `🎯 ${minTxt} Tentou de longe, sem direção.`];
        this._log(`${pick(miss)} (xG ${xg.toFixed(2)})`);
      }
    },

    _foul() {
      const homeFoul = rnd() < 0.52;
      const team = homeFoul ? "home" : "away";
      this.state.stats[team].fouls += 1;

      const minTxt = formatMinute(this.state.minute);
      const msgs = [`⚠️ ${minTxt} Falta dura no meio-campo.`, `⚠️ ${minTxt} Chegada forte! Falta marcada.`, `⚠️ ${minTxt} Entrada atrasada, falta.`];
      this._log(pick(msgs));

      // disciplina
      if (rnd() < 0.02) {
        this.state.cards[team].r += 1;
        this._log(`🟥 ${minTxt} EXPULSO! (${team === "home" ? "Casa" : "Visitante"})`);
        this._updateBest(team === "home" ? "away" : "home", 7.6, "Superioridade numérica");
      } else if (rnd() < 0.16) {
        this.state.cards[team].y += 1;
        this._log(`🟨 ${minTxt} Cartão amarelo. (${team === "home" ? "Casa" : "Visitante"})`);
      }
    },

    _corner() {
      const homeCorner = rnd() < this.state.possBiasHome;
      const team = homeCorner ? "home" : "away";
      this.state.stats[team].corners += 1;

      const minTxt = formatMinute(this.state.minute);
      this._log(`🚩 ${minTxt} Escanteio para o ${team === "home" ? "time da casa" : "visitante"}.`);
      if (rnd() < 0.18) this._attack(true);
    },

    _injuryEvent() {
      const onHome = rnd() < 0.50;
      const team = onHome ? "home" : "away";
      const minTxt = formatMinute(this.state.minute);

      const msgs = [`🤕 ${minTxt} Jogador sente a coxa e pede atendimento.`, `🤕 ${minTxt} Pancada forte, atleta no chão.`, `🤕 ${minTxt} Problema físico, atendimento em campo.`];
      this._log(pick(msgs));
      this.state.injuries.push({ team, minute: this.state.minute });

      // pequeno impacto tático
      if (team === "home") this.state.possBiasHome = clamp(this.state.possBiasHome - 0.02, 0.33, 0.67);
      else this.state.possBiasHome = clamp(this.state.possBiasHome + 0.02, 0.33, 0.67);
    },

    _updateBest(team, note, reason) {
      if (note > (this.state.best.note || 6.0)) {
        this.state.best = { team, note, reason };
      }
    },

    _possessionPct(side) {
      const h = this.state.stats.home.possessionTicks;
      const a = this.state.stats.away.possessionTicks;
      const total = h + a;
      if (!total) return 50;
      const pctHome = Math.round((h / total) * 100);
      return side === "home" ? pctHome : (100 - pctHome);
    },

    _buildReport(roundResults) {
      const ctx = window.currentMatchContext || {};
      const competitionName =
        ctx.competitionName ||
        (ctx.competition === "REGIONAL" ? "Estadual" : (ctx.competition === "CUP" ? "Copa do Brasil" : "Série / Jogo"));

      const roundLabel = (ctx.roundNumber ? `Rodada ${ctx.roundNumber}` : (ctx.week ? `Semana ${ctx.week}` : (ctx.round ? `Rodada ${ctx.round}` : "—")));

      const s = this.state.stats;
      const pHome = this._possessionPct("home");
      const pAway = 100 - pHome;

      const raw = Array.isArray(this.state.events) ? this.state.events.slice() : [];
      const moments = raw
        .map(e => e.text)
        .filter(t => typeof t === "string")
        .filter(t => t.includes("⚽") || t.includes("🟥") || t.includes("🟨") || t.includes("🤕") || t.includes("🧤") || t.includes("🏁") || t.includes("⏸️") || t.includes("🚩"))
        .slice(-12)
        .reverse()
        .slice(0, 8)
        .reverse();

      return {
        competitionName,
        roundLabel,
        homeId: this.state.homeId,
        awayId: this.state.awayId,
        goalsHome: n(this.state.goalsHome, 0),
        goalsAway: n(this.state.goalsAway, 0),
        motmText: (this.state.best?.team ? ((this.state.best.team === "home" ? "Casa" : "Visitante") + " • " + (this.state.best.reason || "Destaque")) : "—"),
        stats: {
          possessionHome: pHome,
          possessionAway: pAway,
          shotsHome: n(s.home.shots, 0),
          shotsAway: n(s.away.shots, 0),
          shotsOnHome: n(s.home.shotsOn, 0),
          shotsOnAway: n(s.away.shotsOn, 0),
          xgHome: n(s.home.xg, 0),
          xgAway: n(s.away.xg, 0),
          cornersHome: n(s.home.corners, 0),
          cornersAway: n(s.away.corners, 0),
          foulsHome: n(s.home.fouls, 0),
          foulsAway: n(s.away.fouls, 0),
          cardsHomeY: n(this.state.cards.home.y, 0),
          cardsHomeR: n(this.state.cards.home.r, 0),
          cardsAwayY: n(this.state.cards.away.y, 0),
          cardsAwayR: n(this.state.cards.away.r, 0)
        },
        moments,
        roundResults: Array.isArray(roundResults) ? roundResults : null,
        played: this.state.played
      };
    },

    _applyFitnessConsequences(report) {
      // 1) aplica carga de jogo (fatigue) por minutos
      const allPids = []
        .concat(this.state.played.home || [])
        .concat(this.state.played.away || [])
        .map(String);

      for (const pid of allPids) {
        const mins = n(this.state.minutesPlayed[pid], 0);
        if (mins > 0) applyMatchLoad(pid, mins);
      }

      // 2) distribui cartões em jogadores aleatórios de cada time
      function pickFrom(list) {
        if (!Array.isArray(list) || !list.length) return null;
        return String(list[Math.floor(Math.random() * list.length)]);
      }

      const hy = n(this.state.cards.home.y, 0);
      const ay = n(this.state.cards.away.y, 0);
      const hr = n(this.state.cards.home.r, 0);
      const ar = n(this.state.cards.away.r, 0);

      for (let i = 0; i < hy; i++) {
        const pid = pickFrom(this.state.played.home);
        if (pid) giveYellow(pid);
      }
      for (let i = 0; i < ay; i++) {
        const pid = pickFrom(this.state.played.away);
        if (pid) giveYellow(pid);
      }
      for (let i = 0; i < hr; i++) {
        const pid = pickFrom(this.state.played.home);
        if (pid) giveRed(pid);
      }
      for (let i = 0; i < ar; i++) {
        const pid = pickFrom(this.state.played.away);
        if (pid) giveRed(pid);
      }

      // 3) aplica lesões persistentes (injuryWeeks) com base nos eventos
      const injArr = Array.isArray(this.state.injuries) ? this.state.injuries : [];
      for (const inj of injArr) {
        const side = String(inj?.team || "");
        const pool = (side === "home") ? this.state.played.home : this.state.played.away;
        const pid = pickFrom(pool);
        if (!pid) continue;

        const r = Math.random();
        const weeks = r < 0.65 ? 1 : (r < 0.90 ? 2 : 4); // leve/média/grave simples e estável
        applyInjuryWeeks(pid, weeks);
      }
    },

    _finish() {
      if (!this.state || this.state.finished) return;

      this.state.finished = true;
      this._stopLoop();
      this._log("🏁 Fim de jogo!");

      const homeId = this.state.homeId;
      const awayId = this.state.awayId;

      let roundResults = null;
      if (window.League && typeof League.processarRodadaComJogoDoUsuario === "function") {
        roundResults = League.processarRodadaComJogoDoUsuario(homeId, awayId, this.state.goalsHome, this.state.goalsAway);
      }

      const report = this._buildReport(roundResults);

      // Dynamics + News
      try {
        let summary = null;
        if (window.Dynamics && typeof Dynamics.applyPostMatch === "function") {
          summary = Dynamics.applyPostMatch(report);
        }
        if (window.News && typeof News.addMatchNews === "function") {
          News.addMatchNews(report, summary);
        }
      } catch (e) {
        console.warn("[Match] Falha em Dynamics/News:", e);
      }

      // Fitness consequences
      try {
        this._applyFitnessConsequences(report);
      } catch (e) {
        console.warn("[Match] Falha em Fitness consequências:", e);
      }

      // Contracts: conta jogo do usuário
      try {
        const gs = window.gameState || {};
        const userTeamId = (gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null));
        const isUserMatch = userTeamId && (String(userTeamId) === String(report.homeId) || String(userTeamId) === String(report.awayId));
        if (isUserMatch && window.Contracts && typeof Contracts.onUserMatchFinished === "function") {
          Contracts.onUserMatchFinished();
          if (typeof Contracts.recalcWageUsed === "function") Contracts.recalcWageUsed(userTeamId);
        }
      } catch (e) {
        console.warn("[Match] Falha em Contracts:", e);
      }

      // abrir relatório
      if (window.UI && typeof UI.abrirRelatorioPosJogo === "function") {
        UI.abrirRelatorioPosJogo(report);
      } else if (window.PostMatchUI && typeof PostMatchUI.openReport === "function") {
        PostMatchUI.openReport(report);
      } else {
        alert(`Fim de jogo!\n${this.state.goalsHome} x ${this.state.goalsAway}`);
        if (window.UI && typeof UI.voltarLobby === "function") UI.voltarLobby();
      }

      // salvar
      try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}

      try { window.currentMatchContext = null; } catch (e) {}
    },

    _log(text) {
      const log = document.getElementById("log-partida");
      if (log) {
        const line = document.createElement("div");
        line.textContent = text;
        log.appendChild(line);
        log.scrollTop = log.scrollHeight;
      }
      if (this.state && Array.isArray(this.state.events)) {
        this.state.events.push({ minute: this.state.minute || 0, text });
      }
    },

    registrarEvento(texto) { this._log(texto); },

    substituicoes() {
      if (!this.state) return;
      if (this.state.minute < 45) {
        alert("Faça substituições pelo botão TÁTICAS antes do jogo ou no intervalo.");
        return;
      }
      alert("No intervalo você pode abrir a tela de tática e salvar a nova escalação.");
    }
  };
})();