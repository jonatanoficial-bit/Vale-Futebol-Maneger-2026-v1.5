/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/match.js – Simulação de partida (TÁTICAS + PÓS-JOGO AAA)
   -------------------------------------------------------
   - Usa Tactics.getMatchModifiers() quando disponível
   - Após o apito final:
     • processa tabelas (League.processarRodada...)
     • chama PostMatch.processMatch(...)
     • abre PostMatchUI.open(report)
   =======================================================*/

window.Match = {
  state: null,
  timer: null,

  // ---------------------------------------------------
  // Inicia o próximo jogo do usuário
  // ---------------------------------------------------
  iniciarProximoJogo() {
    if (!window.Database || !Database.teams) {
      alert("Banco de dados não carregado.");
      return;
    }
    if (!window.Game || !Game.teamId) {
      alert("Time do usuário não definido.");
      return;
    }
    if (!window.Calendar || typeof Calendar.getProximoJogoDoUsuario !== "function") {
      alert("Calendário não encontrado.");
      return;
    }

    const jogo = Calendar.getProximoJogoDoUsuario();
    if (!jogo) {
      alert("Sem jogo agendado.");
      return;
    }

    this.state = {
      homeId: jogo.homeId,
      awayId: jogo.awayId,
      minute: 0,
      goalsHome: 0,
      goalsAway: 0,
      finished: false,
      halftimeDone: false,
      finishedISO: null
    };

    this._setupTelaPartida(jogo.homeId, jogo.awayId);

    // garante escalação/tática antes do jogo
    try {
      if (window.Tactics && typeof Tactics.ensureElencoETitulares === "function") {
        Tactics.ensureElencoETitulares();
      }
    } catch (e) {}

    const log = document.getElementById("log-partida");
    if (log) log.innerHTML = "";
    const cron = document.getElementById("cronometro");
    if (cron) cron.textContent = "0'";

    this.comecarLoop();
  },

  // ---------------------------------------------------
  _setupTelaPartida(home, away) {
    const elHome = document.getElementById("partida-home");
    const elAway = document.getElementById("partida-away");
    const logoHome = document.getElementById("logo-home");
    const logoAway = document.getElementById("logo-away");
    const golsHome = document.getElementById("gols-home");
    const golsAway = document.getElementById("gols-away");

    const homeTeam = Database.teams.find(t => t.id === home);
    const awayTeam = Database.teams.find(t => t.id === away);

    if (elHome) elHome.textContent = homeTeam ? homeTeam.name : "Casa";
    if (elAway) elAway.textContent = awayTeam ? awayTeam.name : "Visitante";

    if (logoHome && homeTeam && homeTeam.logo) logoHome.src = homeTeam.logo;
    if (logoAway && awayTeam && awayTeam.logo) logoAway.src = awayTeam.logo;

    if (golsHome) golsHome.textContent = "0";
    if (golsAway) golsAway.textContent = "0";

    if (typeof mostrarTela === "function") {
      mostrarTela("tela-partida");
    }
  },

  // ---------------------------------------------------
  comecarLoop() {
    if (!this.state) return;

    this.pausarLoop();

    this.timer = setInterval(() => {
      if (!this.state || this.state.finished) return;

      this.state.minute += 1;

      const cron = document.getElementById("cronometro");
      if (cron) cron.textContent = `${this.state.minute}'`;

      // intervalo
      if (this.state.minute === 45 && !this.state.halftimeDone) {
        this.state.halftimeDone = true;
        this._intervalo();
        return;
      }

      this._simularMomento();

      const golsHome = document.getElementById("gols-home");
      const golsAway = document.getElementById("gols-away");
      if (golsHome) golsHome.textContent = this.state.goalsHome.toString();
      if (golsAway) golsAway.textContent = this.state.goalsAway.toString();

      if (this.state.minute >= 90) {
        this._finalizarPartida();
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
  _intervalo() {
    this.pausarLoop();
    setTimeout(() => {
      const ok = confirm("Intervalo! Deseja ajustar táticas/substituições?");
      if (ok) {
        if (typeof mostrarTela === "function") mostrarTela("tela-taticas");
        else alert("Abra TÁTICAS pelo menu se existir.");
      } else {
        this.comecarLoop();
      }
    }, 60);
  },

  // ---------------------------------------------------
  // Força do time (média OVR + tática)
  // ---------------------------------------------------
  forcaDoTime(teamId) {
    const elenco = (window.Database && Database.players)
      ? Database.players.filter(p => String(p.teamId) === String(teamId))
      : [];

    if (!elenco.length) return 70;

    const media = elenco.reduce((s, p) => s + (p.overall || p.ovr || 70), 0) / elenco.length;

    // bônus legado (compat)
    let bonus = 0;
    if (window.Game && String(teamId) === String(Game.teamId)) {
      if (Game.estilo === "ofensivo") bonus += 2;
      if (Game.estilo === "defensivo") bonus -= 1;
    }

    // bônus real por tática
    try {
      if (window.Tactics && typeof Tactics.getMatchModifiers === "function") {
        const mods = Tactics.getMatchModifiers(teamId);
        bonus += (mods.attackMul - 1) * 6.0;
        bonus += (mods.defenseMul - 1) * 3.5;
        bonus -= (mods.riskMul - 1) * 2.5;
      }
    } catch (e) {}

    return Math.round(media + bonus);
  },

  // ---------------------------------------------------
  // Simulação de eventos (probabilidades influenciadas)
  // ---------------------------------------------------
  _simularMomento() {
    if (!this.state) return;

    const fHome = this.forcaDoTime(this.state.homeId);
    const fAway = this.forcaDoTime(this.state.awayId);

    const diff = fHome - fAway;

    let baseProb = 0.10;

    // ritmo aumenta volume de chances
    try {
      if (window.Tactics && typeof Tactics.getMatchModifiers === "function") {
        const mh = Tactics.getMatchModifiers(this.state.homeId);
        const ma = Tactics.getMatchModifiers(this.state.awayId);
        const tempoAvg = ((mh.tempoMul || 1) + (ma.tempoMul || 1)) / 2;
        baseProb *= tempoAvg;
        baseProb = Math.max(0.07, Math.min(0.15, baseProb));
      }
    } catch (e) {}

    let probHome = baseProb + diff * 0.0015;
    let probAway = baseProb - diff * 0.0015;

    // aplica ataque/defesa e risco
    try {
      if (window.Tactics && typeof Tactics.getMatchModifiers === "function") {
        const mh = Tactics.getMatchModifiers(this.state.homeId);
        const ma = Tactics.getMatchModifiers(this.state.awayId);

        probHome *= (mh.attackMul || 1);
        probHome *= (ma.riskMul || 1) / (ma.defenseMul || 1);

        probAway *= (ma.attackMul || 1);
        probAway *= (mh.riskMul || 1) / (mh.defenseMul || 1);

        const capHi = 0.30;
        probHome = Math.max(0.02, Math.min(capHi, probHome));
        probAway = Math.max(0.02, Math.min(capHi, probAway));
      } else {
        probHome = Math.max(0.02, Math.min(0.25, probHome));
        probAway = Math.max(0.02, Math.min(0.25, probAway));
      }
    } catch (e) {
      probHome = Math.max(0.02, Math.min(0.25, probHome));
      probAway = Math.max(0.02, Math.min(0.25, probAway));
    }

    const sorte = Math.random();

    if (sorte < probHome) {
      this._registrarGol(true);
    } else if (sorte < probHome + probAway) {
      this._registrarGol(false);
    } else if (sorte < probHome + probAway + 0.05) {
      this.registrarEvento("Lance perigoso, mas a defesa afastou.");
    }
  },

  _registrarGol(isHome) {
    if (!this.state) return;

    if (isHome) {
      this.state.goalsHome++;
      this.registrarEvento("GOOOOL do time da casa!");
    } else {
      this.state.goalsAway++;
      this.registrarEvento("GOOOOL do time visitante!");
    }
  },

  // ---------------------------------------------------
  // Fim de jogo
  // ---------------------------------------------------
  _finalizarPartida() {
    if (!this.state) return;

    this.state.finished = true;
    this.state.finishedISO = new Date().toISOString();
    this.pausarLoop();

    const homeId = this.state.homeId;
    const awayId = this.state.awayId;
    const golsHome = this.state.goalsHome;
    const golsAway = this.state.goalsAway;

    // 1) Processa tabela/rodada se existir
    let rodada = null;
    if (window.League && typeof League.processarRodadaComJogoDoUsuario === "function") {
      try {
        rodada = League.processarRodadaComJogoDoUsuario(homeId, awayId, golsHome, golsAway);
      } catch (e) {}
    }

    // 2) Pós-jogo (ratings + forma/moral + lesões)
    let report = null;
    try {
      if (window.PostMatch && typeof PostMatch.processMatch === "function") {
        report = PostMatch.processMatch({
          homeId,
          awayId,
          goalsHome: golsHome,
          goalsAway: golsAway,
          minute: this.state.minute,
          finishedISO: this.state.finishedISO
        });
      }
    } catch (e) {
      console.warn("[Match] PostMatch falhou:", e);
    }

    // 3) Mostrar UI pós-jogo (AAA)
    if (report && window.PostMatchUI && typeof PostMatchUI.open === "function") {
      PostMatchUI.open(report);
      return;
    }

    // fallback antigo
    if (window.UI && typeof UI.mostrarResultadosRodada === "function" && rodada) {
      UI.mostrarResultadosRodada(rodada);
    } else if (window.UI && typeof UI.voltarLobby === "function") {
      alert(`Fim de jogo!\nPlacar: ${golsHome} x ${golsAway}`);
      UI.voltarLobby();
    } else {
      alert(`Fim de jogo!\nPlacar: ${golsHome} x ${golsAway}`);
      if (typeof mostrarTela === "function") mostrarTela("tela-lobby");
    }
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
  // Substituições (placeholder)
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