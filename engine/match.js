/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/match.js – Match Engine v2 (mais profundo)

   Mantém compatibilidade com:
   - UI atual (log-partida, cronometro, gols-home/gols-away, logos)
   - League.processarRodadaComJogoDoUsuario(...)
   - Intervalo com opção de abrir táticas

   Adiciona:
   - Estatísticas (posse, finalizações, no alvo, xG, faltas, escanteios)
   - Eventos mais ricos
   - Cartões / lesões leves
   - "Melhor em campo" simples
   - Probabilidades influenciadas por elenco + formação do usuário (se existir)
   =======================================================*/

(function () {
  console.log("%c[Match] match.js v2 carregado", "color:#22c55e; font-weight:bold;");

  // -----------------------------
  // Helpers
  // -----------------------------
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rand() { return Math.random(); }
  function randInt(a, b) { return Math.floor(a + rand() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(rand() * arr.length)]; }

  function ensureGameState() {
    if (!window.gameState) window.gameState = {};
  }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }

  function getPlayers() {
    return (window.Database && Array.isArray(Database.players)) ? Database.players : [];
  }

  function getTeamById(id) {
    return getTeams().find(t => t.id === id) || null;
  }

  function getTeamPlayers(teamId) {
    return getPlayers().filter(p => p.teamId === teamId);
  }

  function getCurrentUserTeamId() {
    return (window.gameState && gameState.currentTeamId) || (window.Game && Game.teamId) || null;
  }

  function getUserFormation() {
    // UI antiga usa Game.formacao; Tactics pode atualizar.
    if (window.Game && Game.formacao) return String(Game.formacao);
    if (window.gameState && gameState.formacao) return String(gameState.formacao);
    return null;
  }

  function parseFormation(form) {
    // "4-4-2" -> {def:4, mid:4, att:2}
    if (!form || typeof form !== "string") return { def: 4, mid: 4, att: 2 };
    const parts = form.split("-").map(n => parseInt(n, 10)).filter(n => !isNaN(n));
    if (parts.length < 3) return { def: 4, mid: 4, att: 2 };
    return { def: parts[0], mid: parts[1], att: parts[2] };
  }

  function computeSquadStrength(teamId, preferUserTitulares) {
    const all = getTeamPlayers(teamId);
    if (!all.length) return { atk: 65, mid: 65, def: 65, gk: 65, ovr: 65, sample: [] };

    let sample = [];

    // Se for o time do usuário, tentamos usar titulares do Tactics (se existir).
    if (preferUserTitulares && window.gameState && Array.isArray(gameState.titulares) && gameState.titulares.length) {
      // titulares guarda objetos com playerId e pos? dependendo da implementação.
      // Vamos tentar mapear por playerId / id.
      const ids = gameState.titulares
        .map(x => x?.playerId || x?.id || x)
        .filter(Boolean);
      const chosen = ids.map(pid => all.find(p => (p.id === pid || p.playerId === pid))).filter(Boolean);
      if (chosen.length >= 8) sample = chosen.slice(0, 11);
    }

    // fallback: pega top 11 por overall
    if (!sample.length) {
      const sorted = all.slice().sort((a, b) => (Number(b.ovr || b.overall || 0) - Number(a.ovr || a.overall || 0)));
      sample = sorted.slice(0, Math.min(11, sorted.length));
    }

    // Se existir "pos" nos jogadores, usamos; senão heurística pelo nome da posição do player
    const getPos = (p) => String(p.pos || p.position || "").toUpperCase();

    let gk = [];
    let defs = [];
    let mids = [];
    let atks = [];

    for (const p of sample) {
      const pos = getPos(p);
      if (pos.includes("GOL") || pos === "GK") gk.push(p);
      else if (pos.includes("ZAG") || pos.includes("LD") || pos.includes("LE") || pos.includes("DEF") || pos.includes("RB") || pos.includes("LB") || pos.includes("CB")) defs.push(p);
      else if (pos.includes("VOL") || pos.includes("MEI") || pos.includes("MID") || pos.includes("CM") || pos.includes("DM") || pos.includes("AM")) mids.push(p);
      else if (pos.includes("ATA") || pos.includes("PON") || pos.includes("ST") || pos.includes("FW") || pos.includes("W")) atks.push(p);
      else mids.push(p);
    }

    function avg(list) {
      if (!list.length) return 65;
      const vals = list.map(p => Number(p.ovr || p.overall || 65)).filter(n => !isNaN(n));
      if (!vals.length) return 65;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    }

    const atk = avg(atks.length ? atks : sample.slice(0, 3));
    const mid = avg(mids.length ? mids : sample.slice(3, 7));
    const def = avg(defs.length ? defs : sample.slice(7, 10));
    const gkV = avg(gk.length ? gk : sample.slice(0, 1));

    const ovr = avg(sample);

    return { atk, mid, def, gk: gkV, ovr, sample };
  }

  function computePossessionBias(home, away, homeForm, awayForm) {
    // base: meio-campo + leve influência da formação (mais meio -> +posse)
    const hf = parseFormation(homeForm);
    const af = parseFormation(awayForm);

    const homeMidFactor = (home.mid - away.mid) / 30;
    const homeMidCountFactor = (hf.mid - af.mid) / 10;

    const bias = clamp(0.50 + homeMidFactor * 0.12 + homeMidCountFactor * 0.06, 0.35, 0.65);
    return bias; // probabilidade de posse do HOME em "disputas"
  }

  function chanceQualityXg(isBigChance) {
    // distribuição simples
    if (isBigChance) return clamp(0.28 + rand() * 0.35, 0.22, 0.70);
    return clamp(0.03 + rand() * 0.17, 0.02, 0.25);
  }

  function goalProbability(att, def, gk, isBigChance) {
    // chance de converter: ataque vs defesa+gk
    // Ajuste: big chance tem base maior
    const base = isBigChance ? 0.22 : 0.08;
    const attFactor = (att - 60) / 100; // ~0-0.3
    const resFactor = ((def + gk) / 2 - 60) / 120; // ~0-0.25
    const p = clamp(base + attFactor * 0.18 - resFactor * 0.16 + (rand() - 0.5) * 0.04, 0.03, 0.45);
    return p;
  }

  function formatMinute(min) {
    if (min <= 90) return `${min}'`;
    return `90+${min - 90}'`;
  }

  // -----------------------------
  // Match Module
  // -----------------------------
  window.Match = {
    state: null,
    timer: null,

    // ---------------------------------------------------
    // Inicia um jogo (fallback antigo) – ainda existe
    // ---------------------------------------------------
    iniciarProximoJogo() {
      if (!window.Database || !Database.teams) {
        alert("Banco de dados não carregado.");
        return;
      }
      ensureGameState();

      const teamId = getCurrentUserTeamId();
      if (!teamId) {
        alert("Nenhum time selecionado.");
        return;
      }

      const teams = getTeams();
      const userTeam = teams.find(t => t.id === teamId);
      if (!userTeam) {
        alert("Time não encontrado.");
        return;
      }

      // pega um adversário aleatório (mesma divisão se possível)
      const div = userTeam.division || userTeam.league || "A";
      const candidates = teams.filter(t => t.id !== teamId && (t.division || t.league || "A") === div);
      const away = candidates.length ? pick(candidates) : pick(teams.filter(t => t.id !== teamId));
      const home = userTeam;

      this._startMatch(home.id, away.id, { competition: "FRIENDLY" });
    },

    // ---------------------------------------------------
    // API pública: encerra partida (compatibilidade)
    // ---------------------------------------------------
    finalizarPartida() {
      this._finalizarPartida();
    },

    // ---------------------------------------------------
    // Setup de tela da partida (mantém sua UI)
    // ---------------------------------------------------
    _setupTelaPartida(home, away) {
      const elHome = document.getElementById("partida-home");
      const elAway = document.getElementById("partida-away");
      const logoHome = document.getElementById("logo-home");
      const logoAway = document.getElementById("logo-away");
      const golsHome = document.getElementById("gols-home");
      const golsAway = document.getElementById("gols-away");

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
    },

    // ---------------------------------------------------
    // Inicia match de fato
    // ---------------------------------------------------
    _startMatch(homeId, awayId, context) {
      ensureGameState();

      const homeTeam = getTeamById(homeId) || { id: homeId, name: homeId };
      const awayTeam = getTeamById(awayId) || { id: awayId, name: awayId };

      // contexto externo (League/Cup/Regionais) pode setar window.currentMatchContext
      if (context && typeof context === "object") {
        window.currentMatchContext = Object.assign({}, window.currentMatchContext || {}, context);
      }

      const userTeamId = getCurrentUserTeamId();
      const isUserHome = userTeamId && userTeamId === homeId;
      const isUserAway = userTeamId && userTeamId === awayId;

      const homeForm = (isUserHome ? getUserFormation() : null) || "4-4-2";
      const awayForm = (isUserAway ? getUserFormation() : null) || "4-4-2";

      const homePow = computeSquadStrength(homeId, isUserHome);
      const awayPow = computeSquadStrength(awayId, isUserAway);

      const possBiasHome = computePossessionBias(homePow, awayPow, homeForm, awayForm);

      this.state = {
        homeId,
        awayId,
        minute: 0,
        goalsHome: 0,
        goalsAway: 0,
        finished: false,
        halftimeDone: false,

        // “motores”
        homePow,
        awayPow,
        homeForm,
        awayForm,
        possBiasHome,

        // disciplina/lesão simples
        cards: {
          home: { y: 0, r: 0 },
          away: { y: 0, r: 0 }
        },
        injuries: [],

        // stats
        stats: {
          home: { possessionTicks: 0, shots: 0, shotsOn: 0, corners: 0, fouls: 0, xg: 0 },
          away: { possessionTicks: 0, shots: 0, shotsOn: 0, corners: 0, fouls: 0, xg: 0 }
        },

        // destaques
        best: { team: null, note: 6.0, reason: "" }
      };

      // UI base
      if (typeof this._setupTelaPartida === "function") {
        this._setupTelaPartida(homeTeam, awayTeam);
      }
      const log = document.getElementById("log-partida");
      if (log) log.innerHTML = "";
      const cron = document.getElementById("cronometro");
      if (cron) cron.textContent = "0'";

      // mensagem inicial
      const titleParts = [];
      if (window.currentMatchContext?.competitionName) titleParts.push(currentMatchContext.competitionName);
      if (window.currentMatchContext?.division) titleParts.push(`Divisão ${currentMatchContext.division}`);
      if (window.currentMatchContext?.roundNumber) titleParts.push(`Rodada ${currentMatchContext.roundNumber}`);
      if (titleParts.length) this.registrarEvento(`🏟️ ${titleParts.join(" • ")}`);
      this.registrarEvento("Bola rolando!");

      this.comecarLoop();
    },

    // ---------------------------------------------------
    // Loop principal
    // ---------------------------------------------------
    comecarLoop() {
      if (!this.state) return;
      this.pausarLoop();

      this.timer = setInterval(() => {
        if (!this.state || this.state.finished) return;

        // avança tempo (pode simular acréscimos)
        let inc = 1;
        if (this.state.minute >= 90) inc = 1;
        this.state.minute += inc;

        const cron = document.getElementById("cronometro");
        if (cron) cron.textContent = formatMinute(this.state.minute);

        // atualiza posse por “ticks”
        this._tickPossession();

        // eventos do minuto
        this._processMinuteEvents();

        // atualiza placar na UI
        const golsHome = document.getElementById("gols-home");
        const golsAway = document.getElementById("gols-away");
        if (golsHome) golsHome.textContent = String(this.state.goalsHome);
        if (golsAway) golsAway.textContent = String(this.state.goalsAway);

        // intervalo
        if (this.state.minute >= 45 && !this.state.halftimeDone) {
          this.state.halftimeDone = true;
          this._intervalo();
          return;
        }

        // fim do jogo (com acréscimos simples)
        if (this.state.minute >= 90) {
          // acréscimos: 2–6 minutos, dependendo de eventos
          const extra = this._estimateExtraTime();
          if (!this.state._extraTimeSet) {
            this.state._extraTimeSet = true;
            this.state._endMinute = 90 + extra;
          }
          if (this.state.minute >= this.state._endMinute) {
            this.finalizarPartida();
          }
        }
      }, 600);
    },

    pausarLoop() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },

    // ---------------------------------------------------
    // Intervalo – pergunta sobre ajustes
    // ---------------------------------------------------
    _intervalo() {
      this.pausarLoop();
      this.registrarEvento("⏸️ Intervalo!");

      // resumo rápido
      const s = this.state.stats;
      const pHome = this._getPossessionPercent("home");
      const pAway = 100 - pHome;
      this.registrarEvento(
        `📊 Intervalo: Posse ${pHome}% x ${pAway}% | Finalizações ${s.home.shots} x ${s.away.shots} | xG ${s.home.xg.toFixed(2)} x ${s.away.xg.toFixed(2)}`
      );

      setTimeout(() => {
        const quer = confirm("Intervalo! Deseja ajustar táticas/escalação?");
        if (quer && window.UI && typeof UI.abrirTaticas === "function") {
          UI.abrirTaticas();
        } else {
          this.registrarEvento("Recomeça a partida!");
          this.comecarLoop();
        }
      }, 50);
    },

    // -----------------------------
    // Lógica do minuto
    // -----------------------------
    _tickPossession() {
      if (!this.state) return;
      const homeHas = rand() < this.state.possBiasHome;
      if (homeHas) this.state.stats.home.possessionTicks++;
      else this.state.stats.away.possessionTicks++;
    },

    _estimateExtraTime() {
      if (!this.state) return 3;
      const totalCards = this.state.cards.home.y + this.state.cards.away.y + (this.state.cards.home.r * 2) + (this.state.cards.away.r * 2);
      const injuries = this.state.injuries.length;
      const goals = this.state.goalsHome + this.state.goalsAway;

      const base = 2;
      const add = clamp(Math.floor(goals * 0.6 + totalCards * 0.35 + injuries * 1.2 + rand() * 2), 0, 6);
      return clamp(base + add, 2, 6);
    },

    _processMinuteEvents() {
      if (!this.state) return;

      const minute = this.state.minute;
      const homePow = this.state.homePow;
      const awayPow = this.state.awayPow;

      // intensidade do jogo: cresce no 2º tempo
      const tempoFactor = minute < 45 ? 0.90 : 1.05;

      // disputa por chance (uma ou duas ações por minuto no máximo)
      const chanceBase = 0.10 * tempoFactor; // prob por minuto de ocorrer uma "ação de ataque"
      const secondChanceBase = 0.05 * tempoFactor;

      if (rand() < chanceBase) this._createAttackEvent();
      if (rand() < secondChanceBase && minute > 10) this._createAttackEvent(true);

      // faltas/cartões leves
      const foulBase = 0.06 * tempoFactor;
      if (rand() < foulBase) this._createFoulEvent();

      // escanteios (muito simples)
      if (rand() < 0.035 * tempoFactor) this._createCornerEvent();

      // lesões (raras)
      if (rand() < 0.006 * tempoFactor) this._createInjuryEvent();

      // pequenos textos de “pressão”
      if (rand() < 0.02) {
        const which = rand() < this.state.possBiasHome ? "home" : "away";
        const msg = which === "home"
          ? "O time da casa troca passes e pressiona."
          : "O visitante encaixa uma boa sequência e avança no campo.";
        this.registrarEvento(msg);
      }
    },

    _createAttackEvent(isSecondary) {
      if (!this.state) return;

      const homeHas = rand() < this.state.possBiasHome;
      const atkTeam = homeHas ? "home" : "away";
      const defTeam = homeHas ? "away" : "home";

      const atkPow = atkTeam === "home" ? this.state.homePow : this.state.awayPow;
      const defPow = defTeam === "home" ? this.state.homePow : this.state.awayPow;

      const isBigChance = rand() < (0.20 + (atkPow.atk - defPow.def) / 220); // mais ataque vs defesa -> mais chances claras
      const xg = chanceQualityXg(isBigChance);

      // registra finalização
      const statsAtk = this.state.stats[atkTeam];
      statsAtk.shots += 1;
      statsAtk.xg += xg;

      // no alvo?
      const onTargetBase = isBigChance ? 0.55 : 0.32;
      const onTarget = rand() < clamp(onTargetBase + (atkPow.atk - defPow.def) / 160, 0.18, 0.75);
      if (onTarget) statsAtk.shotsOn += 1;

      // conversão
      const goalProb = goalProbability(atkPow.atk, defPow.def, defPow.gk, isBigChance);
      const isGoal = onTarget && (rand() < goalProb);

      const minTxt = formatMinute(this.state.minute);

      if (isGoal) {
        if (atkTeam === "home") this.state.goalsHome += 1;
        else this.state.goalsAway += 1;

        // “melhor em campo” simples: quem tiver mais gols+xg
        this._updateBestPlayerHeuristic(atkTeam, isBigChance ? 8.4 : 7.8, "Gol importante");

        const goalMsgs = [
          `⚽ ${minTxt} GOOOOOL!`,
          `⚽ ${minTxt} Bola na rede!`,
          `⚽ ${minTxt} É GOL! Explode o estádio!`
        ];
        this.registrarEvento(`${pick(goalMsgs)} (${atkTeam === "home" ? "Casa" : "Visitante"})`);

        // chance clara -> comentário
        if (isBigChance) this.registrarEvento("Foi uma chance claríssima, finalização perfeita!");
        return;
      }

      // não foi gol: descreve o lance
      if (onTarget) {
        this._updateBestPlayerHeuristic(defTeam, 7.4, "Boa defesa do goleiro");
        const saveMsgs = [
          `🧤 ${minTxt} Chute no alvo... DEFESA do goleiro!`,
          `🧤 ${minTxt} Finalização perigosa e o goleiro espalma!`,
          `🧤 ${minTxt} O goleiro salva!`
        ];
        this.registrarEvento(`${pick(saveMsgs)} (xG ${xg.toFixed(2)})`);
      } else {
        const missMsgs = [
          `🎯 ${minTxt} Finaliza por cima!`,
          `🎯 ${minTxt} Chute para fora!`,
          `🎯 ${minTxt} Tentou de longe, sem direção.`
        ];
        this.registrarEvento(`${pick(missMsgs)} (xG ${xg.toFixed(2)})`);
      }
    },

    _createFoulEvent() {
      if (!this.state) return;
      const homeFoul = rand() < 0.52;
      const team = homeFoul ? "home" : "away";
      this.state.stats[team].fouls += 1;

      const minTxt = formatMinute(this.state.minute);
      const foulMsgs = [
        `🟨 ${minTxt} Falta dura no meio-campo.`,
        `⚠️ ${minTxt} Chegada forte! O árbitro marca falta.`,
        `⚠️ ${minTxt} Entrada atrasada, falta para o adversário.`
      ];
      this.registrarEvento(pick(foulMsgs));

      // cartão?
      const yellowProb = 0.16;
      const redProb = 0.02;

      if (rand() < redProb) {
        this.state.cards[team].r += 1;
        this.registrarEvento(`🟥 ${minTxt} EXPULSO! Cartão vermelho! (${team === "home" ? "Casa" : "Visitante"})`);
        this._updateBestPlayerHeuristic(team === "home" ? "away" : "home", 7.6, "Superioridade numérica");
      } else if (rand() < yellowProb) {
        this.state.cards[team].y += 1;
        this.registrarEvento(`🟨 ${minTxt} Cartão amarelo. (${team === "home" ? "Casa" : "Visitante"})`);
      }
    },

    _createCornerEvent() {
      if (!this.state) return;
      const homeCorner = rand() < this.state.possBiasHome;
      const team = homeCorner ? "home" : "away";
      this.state.stats[team].corners += 1;
      const minTxt = formatMinute(this.state.minute);
      this.registrarEvento(`🚩 ${minTxt} Escanteio para o ${team === "home" ? "time da casa" : "visitante"}.`);

      // chance pequena após escanteio
      if (rand() < 0.18) {
        this._createAttackEvent(true);
      }
    },

    _createInjuryEvent() {
      if (!this.state) return;
      const onHome = rand() < 0.50;
      const team = onHome ? "home" : "away";
      const minTxt = formatMinute(this.state.minute);
      const msgs = [
        `🤕 ${minTxt} Jogador sente a coxa e pede atendimento.`,
        `🤕 ${minTxt} Pancada forte, o atleta fica no chão.`,
        `🤕 ${minTxt} Problema físico, comissão médica em campo.`
      ];
      this.registrarEvento(pick(msgs));
      this.state.injuries.push({ team, minute: this.state.minute });

      // afeta ritmo: posse cai um pouco pro time lesionado
      if (team === "home") this.state.possBiasHome = clamp(this.state.possBiasHome - 0.02, 0.33, 0.67);
      else this.state.possBiasHome = clamp(this.state.possBiasHome + 0.02, 0.33, 0.67);
    },

    _updateBestPlayerHeuristic(team, note, reason) {
      // heurística: só guarda “destaque do jogo” textual
      if (!this.state) return;
      if (note > (this.state.best.note || 6.0)) {
        this.state.best = { team, note, reason };
      }
    },

    _getPossessionPercent(side) {
      const h = this.state.stats.home.possessionTicks;
      const a = this.state.stats.away.possessionTicks;
      const total = h + a;
      if (!total) return 50;
      const pctHome = Math.round((h / total) * 100);
      return side === "home" ? pctHome : (100 - pctHome);
    },

    // ---------------------------------------------------
    // Fim de jogo (compatível com seu fluxo)
    // ---------------------------------------------------
    _finalizarPartida() {
      if (!this.state || this.state.finished) return;

      this.state.finished = true;
      this.pausarLoop();

      const homeId = this.state.homeId;
      const awayId = this.state.awayId;
      const golsHome = this.state.goalsHome;
      const golsAway = this.state.goalsAway;

      // resumo
      const pHome = this._getPossessionPercent("home");
      const pAway = 100 - pHome;
      const s = this.state.stats;

      this.registrarEvento("🏁 Fim de jogo!");
      this.registrarEvento(
        `📊 Estatísticas: Posse ${pHome}% x ${pAway}% | Finalizações ${s.home.shots} x ${s.away.shots} | No alvo ${s.home.shotsOn} x ${s.away.shotsOn} | xG ${s.home.xg.toFixed(2)} x ${s.away.xg.toFixed(2)}`
      );

      const yHome = this.state.cards.home.y, yAway = this.state.cards.away.y;
      const rHome = this.state.cards.home.r, rAway = this.state.cards.away.r;
      if (yHome || yAway || rHome || rAway) {
        this.registrarEvento(`🧾 Cartões: Casa 🟨${yHome} 🟥${rHome} | Visitante 🟨${yAway} 🟥${rAway}`);
      }

      if (this.state.best && this.state.best.team) {
        const who = this.state.best.team === "home" ? "Casa" : "Visitante";
        this.registrarEvento(`⭐ Melhor em campo: ${who} (${this.state.best.reason})`);
      }

      // Mantém compatibilidade: processa rodada da liga (se aplicável)
      let rodada = null;
      if (window.League && typeof League.processarRodadaComJogoDoUsuario === "function") {
        rodada = League.processarRodadaComJogoDoUsuario(homeId, awayId, golsHome, golsAway);
      }

      // Exibe resultados da rodada (liga) – UI existente
      if (window.UI && typeof UI.mostrarResultadosRodada === "function" && rodada) {
        UI.mostrarResultadosRodada(rodada);
      } else if (window.UI && typeof UI.voltarLobby === "function") {
        alert(`Fim de jogo!\nPlacar: ${golsHome} x ${golsAway}`);
        UI.voltarLobby();
      }

      // salva se existir módulo Save
      try {
        if (window.Save && typeof Save.salvar === "function") Save.salvar();
      } catch (e) {}
    },

    // ---------------------------------------------------
    // Log visual
    // ---------------------------------------------------
    registrarEvento(texto) {
      const log = document.getElementById("log-partida");
      if (!log) return;
      const linha = document.createElement("div");
      linha.textContent = texto;
      log.appendChild(linha);
      log.scrollTop = log.scrollHeight;
    },

    // ---------------------------------------------------
    // Substituições (mantém placeholder)
    // ---------------------------------------------------
    substituicoes() {
      if (!this.state) return;
      if (this.state.minute < 45) {
        alert("Faça substituições pelo botão TÁTICAS antes do jogo ou no intervalo.");
        return;
      }
      alert("No intervalo você pode abrir a tela de tática e salvar a nova escalação.");
    }
  };

  // ---------------------------------------------------
  // Compatibilidade com League.prepararProximoJogo
  // (quando League setar Match.state direto e chamar comecarLoop)
  // ---------------------------------------------------
  // Se League preparar Match.state manualmente, precisamos garantir
  // que campos novos existam antes do loop começar.
  const originalComecarLoop = window.Match.comecarLoop.bind(window.Match);
  window.Match.comecarLoop = function () {
    if (window.Match.state && !window.Match.state.stats) {
      // tenta reconstruir parte do contexto faltante
      const homeId = window.Match.state.homeId;
      const awayId = window.Match.state.awayId;

      const userTeamId = getCurrentUserTeamId();
      const isUserHome = userTeamId && userTeamId === homeId;
      const isUserAway = userTeamId && userTeamId === awayId;

      const homeForm = (isUserHome ? getUserFormation() : null) || "4-4-2";
      const awayForm = (isUserAway ? getUserFormation() : null) || "4-4-2";

      const homePow = computeSquadStrength(homeId, isUserHome);
      const awayPow = computeSquadStrength(awayId, isUserAway);
      const possBiasHome = computePossessionBias(homePow, awayPow, homeForm, awayForm);

      window.Match.state.homePow = homePow;
      window.Match.state.awayPow = awayPow;
      window.Match.state.homeForm = homeForm;
      window.Match.state.awayForm = awayForm;
      window.Match.state.possBiasHome = possBiasHome;

      window.Match.state.cards = window.Match.state.cards || { home: { y: 0, r: 0 }, away: { y: 0, r: 0 } };
      window.Match.state.injuries = window.Match.state.injuries || [];
      window.Match.state.stats = window.Match.state.stats || {
        home: { possessionTicks: 0, shots: 0, shotsOn: 0, corners: 0, fouls: 0, xg: 0 },
        away: { possessionTicks: 0, shots: 0, shotsOn: 0, corners: 0, fouls: 0, xg: 0 }
      };
      window.Match.state.best = window.Match.state.best || { team: null, note: 6.0, reason: "" };
    }
    return originalComecarLoop();
  };
})();