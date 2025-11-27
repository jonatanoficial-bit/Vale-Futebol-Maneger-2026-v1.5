/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/match.js – Simulação básica de partida
   =======================================================*/

window.Match = {
  state: null,
  timer: null,

  iniciarProximoJogo() {
    if (!Database || !Database.teams) {
      alert("Banco de dados não carregado.");
      return;
    }

    const myTeam = Database.getTeamById(Game.teamId);
    if (!myTeam) {
      alert("Time do usuário não encontrado.");
      return;
    }

    // escolhe adversário da mesma divisão
    const candidatos = Database.teams.filter(t => t.division === myTeam.division && t.id !== myTeam.id);
    const away = candidatos[Math.floor(Math.random() * candidatos.length)];

    this.state = {
      homeId: myTeam.id,
      awayId: away.id,
      minute: 0,
      goalsHome: 0,
      goalsAway: 0,
      finished: false
    };

    this.prepararTela();
    mostrarTela("tela-partida");
    this.comecarLoop();
  },

  prepararTela() {
    const homeSpan   = document.getElementById("partida-home");
    const awaySpan   = document.getElementById("partida-away");
    const golsHome   = document.getElementById("gols-home");
    const golsAway   = document.getElementById("gols-away");
    const cronometro = document.getElementById("cronometro");
    const log        = document.getElementById("log-partida");
    const logoHome   = document.getElementById("logo-home");
    const logoAway   = document.getElementById("logo-away");

    const homeTeam = Database.getTeamById(this.state.homeId);
    const awayTeam = Database.getTeamById(this.state.awayId);

    if (homeSpan) homeSpan.textContent = homeTeam ? homeTeam.shortName : this.state.homeId;
    if (awaySpan) awaySpan.textContent = awayTeam ? awayTeam.shortName : this.state.awayId;

    if (logoHome && homeTeam) {
        logoHome.src = `assets/logos/${homeTeam.id}.png`;
        logoHome.onerror = () => { logoHome.src = "assets/logos/default.png"; };
    }
    if (logoAway && awayTeam) {
        logoAway.src = `assets/logos/${awayTeam.id}.png`;
        logoAway.onerror = () => { logoAway.src = "assets/logos/default.png"; };
    }

    if (golsHome) golsHome.textContent = "0";
    if (golsAway) golsAway.textContent = "0";
    if (cronometro) cronometro.textContent = "0'";

    if (log) log.innerHTML = "";
},

  comecarLoop() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    this.timer = setInterval(() => {
      if (!this.state || this.state.finished) {
        clearInterval(this.timer);
        return;
      }

      this.state.minute++;

      this.atualizarCronometro();
      this.eventosDaPartida();

  if (this.state.minute >= 90) {
  this.state.finished = true;
  this.registrarEvento("Fim de jogo!");
  clearInterval(this.timer);

  // Integração com League + UI de resultados
  if (window.League) {
    const rodada = League.processarRodadaComJogoDoUsuario(
      this.state.homeId,
      this.state.awayId,
      this.state.goalsHome,
      this.state.goalsAway
    );

    if (window.UI && typeof UI.mostrarResultadosRodada === "function") {
      UI.mostrarResultadosRodada(rodada);
    }
  } else if (window.UI && typeof UI.voltarLobby === "function") {
    alert("Fim de jogo!");
    UI.voltarLobby();
  }
}

  atualizarCronometro() {
    const cronometro = document.getElementById("cronometro");
    if (!cronometro) return;
    cronometro.textContent = `${this.state.minute}'`;
  },

  forcaDoTime(teamId) {
    const elenco = carregarElencoDoTime(teamId);
    let titulares = [];

    if (Game.titulares && Object.keys(Game.titulares).length && teamId === Game.teamId) {
      const titularIds = Object.values(Game.titulares);
      titulares = elenco.filter(p => titularIds.includes(p.id));
    } else {
      // top 11 por overall
      titulares = elenco
        .slice()
        .sort((a, b) => (b.overall || 70) - (a.overall || 70))
        .slice(0, 11);
    }

    const baseMedia = titulares.reduce((s, p) => s + (p.overall || 70), 0) / (titulares.length || 11);

    let bonus = 0;
    if (teamId === Game.teamId) {
      if (Game.estilo === "ofensivo") bonus += 2;
      if (Game.estilo === "defensivo") bonus -= 1;
    }

    return baseMedia + bonus;
  },

  eventosDaPartida() {
    const log = document.getElementById("log-partida");
    if (!log) return;

    const fHome = this.forcaDoTime(this.state.homeId);
    const fAway = this.forcaDoTime(this.state.awayId);

    // chance básica de acontecer algo no minuto
    const chanceEvento = 0.35;
    if (Math.random() > chanceEvento) return;

    const totalForca = fHome + fAway;
    const probHome = fHome / totalForca;

    const atacanteHome = Math.random() < probHome;
    const atacanteId = atacanteHome ? this.state.homeId : this.state.awayId;

    const elenco = carregarElencoDoTime(atacanteId);
    const atacante = elenco.length
      ? elenco[Math.floor(Math.random() * elenco.length)]
      : { name: "Jogador desconhecido" };

    // tipo de evento
    const r = Math.random();
    let msg = "";

    if (r < 0.10) {
      msg = `⚽ ${this.state.minute}' – GOL de ${atacante.name}!`;
      if (atacanteHome) {
        this.state.goalsHome++;
        const gh = document.getElementById("gols-home");
        if (gh) gh.textContent = this.state.goalsHome;
      } else {
        this.state.goalsAway++;
        const ga = document.getElementById("gols-away");
        if (ga) ga.textContent = this.state.goalsAway;
      }
    } else if (r < 0.18) {
      msg = `🟨 ${this.state.minute}' – Cartão amarelo para ${atacante.name}.`;
    } else if (r < 0.20) {
      msg = `🟥 ${this.state.minute}' – Cartão vermelho para ${atacante.name}!`;
    } else if (r < 0.28) {
      msg = `🥅 ${this.state.minute}' – Grande defesa após finalização de ${atacante.name}.`;
    } else if (r < 0.35) {
      msg = `🎯 ${this.state.minute}' – Finalização perigosa de ${atacante.name} para fora.`;
    } else {
      msg = `📌 ${this.state.minute}' – Boa troca de passes do time.`;
    }

    this.registrarEvento(msg);
  },

  registrarEvento(texto) {
    const log = document.getElementById("log-partida");
    if (!log) return;

    const linha = document.createElement("div");
    linha.textContent = texto;
    log.appendChild(linha);
    log.scrollTop = log.scrollHeight;
  },

  substituicoes() {
    if (!this.state) return;
    if (this.state.minute < 45) {
      alert("Substituições oficiais serão liberadas no intervalo (após 45').");
      return;
    }
    // Próxima fase: tela própria de substituições
    alert("Sistema de substituições detalhado será implementado na próxima etapa.");
  }
};
