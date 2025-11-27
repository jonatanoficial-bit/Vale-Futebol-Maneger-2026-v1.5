/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/match.js – Simulação básica de partida
   =======================================================*/

window.Match = {
  state: null,
  timer: null,

  // ---------------------------------------------------
  // Inicia o próximo jogo da carreira
  // ---------------------------------------------------
  iniciarProximoJogo() {
    if (!window.Database || !Database.teams || !Database.getTeamById) {
      alert("Banco de dados não carregado.");
      return;
    }
    if (!window.Game || !Game.teamId) {
      alert("Carreira não iniciada.");
      return;
    }

    const myTeam = Database.getTeamById(Game.teamId);
    if (!myTeam) {
      alert("Time do usuário não encontrado.");
      return;
    }

    // Escolhe adversário da mesma divisão
    const candidatos = Database.teams.filter(
      t => t.division === myTeam.division && t.id !== myTeam.id
    );
    if (!candidatos.length) {
      alert("Não há adversários disponíveis na divisão.");
      return;
    }
    const away = candidatos[Math.floor(Math.random() * candidatos.length)];

    // Estado inicial do jogo
    this.state = {
      homeId: myTeam.id,
      awayId: away.id,
      minute: 0,
      goalsHome: 0,
      goalsAway: 0,
      finished: false
    };

    // Atualiza UI da partida
    this._setupTelaPartida(myTeam, away);

    // Limpa log e cronômetro
    const log = document.getElementById("log-partida");
    if (log) log.innerHTML = "";
    const cron = document.getElementById("cronometro");
    if (cron) cron.textContent = "0'";

    // Começa loop
    this.comecarLoop();
  },

  // ---------------------------------------------------
  // Configura textos/imagens da tela de partida
  // ---------------------------------------------------
  _setupTelaPartida(home, away) {
    const elHome = document.getElementById("partida-home");
    const elAway = document.getElementById("partida-away");
    const logoHome = document.getElementById("logo-home");
    const logoAway = document.getElementById("logo-away");
    const golsHome = document.getElementById("gols-home");
    const golsAway = document.getElementById("gols-away");

    if (elHome) elHome.textContent = home.name;
    if (elAway) elAway.textContent = away.name;

    if (logoHome) {
      logoHome.src = `assets/logos/${home.id}.png`;
      logoHome.onerror = () => { logoHome.src = "assets/logos/default.png"; };
    }
    if (logoAway) {
      logoAway.src = `assets/logos/${away.id}.png`;
      logoAway.onerror = () => { logoAway.src = "assets/logos/default.png"; };
    }

    if (golsHome) golsHome.textContent = "0";
    if (golsAway) golsAway.textContent = "0";

    if (window.mostrarTela) {
      mostrarTela("tela-partida");
    }
  },

  // ---------------------------------------------------
  // Loop da partida (simulação minuto a minuto)
  // ---------------------------------------------------
  comecarLoop() {
    if (!this.state) return;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.timer = setInterval(() => {
      if (!this.state || this.state.finished) {
        clearInterval(this.timer);
        this.timer = null;
        return;
      }

      this.state.minute += 5; // pula de 5 em 5 minutos

      // Atualiza cronômetro
      const cron = document.getElementById("cronometro");
      if (cron) cron.textContent = `${Math.min(this.state.minute, 90)}'`;

      // Simula eventos nesse intervalo
      this._simularMomento();

      // Atualiza placar
      const golsHome = document.getElementById("gols-home");
      const golsAway = document.getElementById("gols-away");
      if (golsHome) golsHome.textContent = this.state.goalsHome.toString();
      if (golsAway) golsAway.textContent = this.state.goalsAway.toString();

      // Fim de jogo
      if (this.state.minute >= 90) {
        this._finalizarPartida();
      }
    }, 600); // 0,6s = 5' pra deixar a partida dinâmica
  },

  // ---------------------------------------------------
  // Força média do time (baseada nos jogadores)
  // ---------------------------------------------------
  forcaDoTime(teamId) {
    if (!Database || !Database.players) return 70;

    const elenco = Database.players.filter(p => p.teamId === teamId);
    if (!elenco.length) return 70;

    const media = elenco.reduce((s, p) => s + (p.overall || 70), 0) / elenco.length;

    let bonus = 0;
    if (teamId === Game.teamId) {
      if (Game.estilo === "ofensivo") bonus += 2;
      if (Game.estilo === "defensivo") bonus -= 1;
    }

    return Math.round(media + bonus);
  },

  // ---------------------------------------------------
  // Simula chances de gol em um “momento” do jogo
  // ---------------------------------------------------
  _simularMomento() {
    if (!this.state) return;

    const fHome = this.forcaDoTime(this.state.homeId);
    const fAway = this.forcaDoTime(this.state.awayId);

    // Probabilidade baseada na diferença de força
    const diff = fHome - fAway; // positivo = casa mais forte
    const baseProb = 0.10;      // 10% de chance de acontecer algo
    let probHome = baseProb + diff * 0.0015;
    let probAway = baseProb - diff * 0.0015;

    probHome = Math.max(0.02, Math.min(0.25, probHome));
    probAway = Math.max(0.02, Math.min(0.25, probAway));

    const sorte = Math.random();

    if (sorte < probHome) {
      this._registrarGol(true);
    } else if (sorte < probHome + probAway) {
      this._registrarGol(false);
    } else if (sorte < probHome + probAway + 0.05) {
      this.registrarEvento("Lance perigoso, mas a defesa afastou!");
    }
  },

  _registrarGol(eGolDoHome) {
    if (!this.state) return;

    if (eGolDoHome) {
      this.state.goalsHome++;
      this.registrarEvento("GOOOOL do time da casa!");
    } else {
      this.state.goalsAway++;
      this.registrarEvento("GOOOOL do time visitante!");
    }
  },

  // ---------------------------------------------------
  // Finaliza a partida e integra com League/UI
  // ---------------------------------------------------
  _finalizarPartida() {
    if (!this.state) return;

    this.state.finished = true;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.registrarEvento("Fim de jogo!");

    const homeId = this.state.homeId;
    const awayId = this.state.awayId;
    const golsHome = this.state.goalsHome;
    const golsAway = this.state.goalsAway;

    // Se existir módulo de liga, processa rodada
    let rodada = null;
    if (window.League && typeof League.processarRodadaComJogoDoUsuario === "function") {
      rodada = League.processarRodadaComJogoDoUsuario(
        homeId,
        awayId,
        golsHome,
        golsAway
      );
    }

    // Mostrar resultados da rodada ou voltar pro lobby
    if (window.UI && typeof UI.mostrarResultadosRodada === "function" && rodada) {
      UI.mostrarResultadosRodada(rodada);
    } else if (window.UI && typeof UI.voltarLobby === "function") {
      alert(`Fim de jogo!\nPlacar: ${golsHome} x ${golsAway}`);
      UI.voltarLobby();
    }
  },

  // ---------------------------------------------------
  // Log de eventos na tela
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
      alert("Substituições oficiais serão liberadas no intervalo (após 45').");
      return;
    }
    alert("Sistema de substituições detalhado será implementado em breve.");
  }
};
