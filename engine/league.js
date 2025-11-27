/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/league.js – Tabela, rodadas e classificação
   =======================================================*/

window.League = {
  ensureInit() {
    if (!window.Game) window.Game = {};
    if (!window.Database || !Database.teams) return;

    // Times da Série A
    const serieA = Database.teams.filter(t => t.division === "A");

    // Tabela inicial
    if (!Game.tabela) {
      Game.tabela = {};
      serieA.forEach(t => {
        Game.tabela[t.id] = {
          teamId: t.id,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          points: 0
        };
      });
    }

    if (!Game.rodadaAtual) Game.rodadaAtual = 1;
    if (!Game.rodadas) Game.rodadas = [];
  },

  _aplicarResultadoNoTime(reg, golsPro, golsContra) {
    reg.played++;
    reg.goalsFor     += golsPro;
    reg.goalsAgainst += golsContra;

    if (golsPro > golsContra) {
      reg.wins++;
      reg.points += 3;
    } else if (golsPro < golsContra) {
      reg.losses++;
    } else {
      reg.draws++;
      reg.points += 1;
    }
  },

  /**
   * Processa uma rodada inteira:
   * - Recebe o jogo do usuário
   * - Simula todos os outros jogos da rodada
   * - Atualiza a tabela (3-1-0)
   * - Salva no Game.rodadas
   */
  processarRodadaComJogoDoUsuario(homeId, awayId, golsHome, golsAway) {
    this.ensureInit();
    if (!Database || !Database.teams) return null;

    const serieAIds = Database.teams
      .filter(t => t.division === "A")
      .map(t => t.id);

    const idsDisponiveis = [...serieAIds];
    const jogos = [];

    // Garante que o jogo do usuário esteja na rodada
    const idxHome = idsDisponiveis.indexOf(homeId);
    if (idxHome !== -1) idsDisponiveis.splice(idxHome, 1);

    const idxAway = idsDisponiveis.indexOf(awayId);
    if (idxAway !== -1) idsDisponiveis.splice(idxAway, 1);

    jogos.push({
      homeTeamId: homeId,
      awayTeamId: awayId,
      homeGoals: golsHome,
      awayGoals: golsAway
    });

    // Embaralha o restante (Fisher–Yates)
    for (let i = idsDisponiveis.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idsDisponiveis[i], idsDisponiveis[j]] = [idsDisponiveis[j], idsDisponiveis[i]];
    }

    // Forma os outros confrontos da rodada
    while (idsDisponiveis.length >= 2) {
      const h = idsDisponiveis.pop();
      const a = idsDisponiveis.pop();
      const randHome = Math.floor(Math.random() * 4); // 0–3 gols
      const randAway = Math.floor(Math.random() * 4);
      jogos.push({
        homeTeamId: h,
        awayTeamId: a,
        homeGoals: randHome,
        awayGoals: randAway
      });
    }

    // Aplica resultados na tabela (3-1-0)
    jogos.forEach(j => {
      const regHome = Game.tabela[j.homeTeamId];
      const regAway = Game.tabela[j.awayTeamId];
      if (!regHome || !regAway) return;

      this._aplicarResultadoNoTime(regHome, j.homeGoals, j.awayGoals);
      this._aplicarResultadoNoTime(regAway, j.awayGoals, j.homeGoals);
    });

    const rodada = {
      numero: Game.rodadaAtual,
      jogos
    };
    Game.rodadas.push(rodada);
    Game.rodadaAtual++;

    if (typeof salvarJogo === "function") {
      salvarJogo();
    }

    return rodada;
  },

  getClassificacaoArray() {
    this.ensureInit();
    const rows = Object.values(Game.tabela || []);

    rows.forEach(r => {
      r.goalDiff = r.goalsFor - r.goalsAgainst;
    });

    rows.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDiff !== a.goalDiff) return b.goalDiff - a.goalDiff;
      if (b.wins !== a.wins) return b.wins - a.wins;
      const teamA = Database.getTeamById(a.teamId);
      const teamB = Database.getTeamById(b.teamId);
      const nameA = teamA ? teamA.name : "";
      const nameB = teamB ? teamB.name : "";
      return nameA.localeCompare(nameB);
    });

    return rows;
  }
};
