/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/league.js – Controle de ligas (Série A e Série B,
   classificação, resultados, promoção e rebaixamento)
   =======================================================*/

window.League = {
  /* ============================
     HELPERS DE ACESSO AO DATABASE
     ============================ */
  _getTeamsArray() {
    // Se existir um objeto Database com .teams, usa ele
    if (window.Database && Array.isArray(Database.teams)) {
      return Database.teams;
    }
    // Senão tenta usar um array global "teams"
    try {
      if (Array.isArray(window.teams)) return window.teams;
    } catch (e) {}
    return [];
  },

  _getPlayersArray() {
    if (window.Database && Array.isArray(Database.players)) {
      return Database.players;
    }
    try {
      if (Array.isArray(window.players)) return window.players;
    } catch (e) {}
    return [];
  },

  _getTeamById(id) {
    const arr = this._getTeamsArray();
    return arr.find(t => t.id === id) || null;
  },

  _getTeamAverageOverall(teamId) {
    const players = this._getPlayersArray().filter(p => p.teamId === teamId);
    if (!players.length) return 70;
    const total = players.reduce((sum, p) => sum + (p.overall || 70), 0);
    return total / players.length;
  },

  _ordenarTabela(tab) {
    const self = this;
    tab.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const sgA = a.sg, sgB = b.sg;
      if (sgB !== sgA) return sgB - sgA;
      if (b.gp !== a.gp) return b.gp - a.gp;

      const ta = self._getTeamById(a.teamId);
      const tb = self._getTeamById(b.teamId);
      return (ta && ta.name ? ta.name : a.teamId)
        .localeCompare(tb && tb.name ? tb.name : b.teamId);
    });
  },

  _getLeagueForDivision(div) {
    if (!window.Game) window.Game = {};
    if (!Game.leagues) Game.leagues = {};
    return Game.leagues[div] || null;
  },

  _setLeagueForDivision(div, liga) {
    if (!window.Game) window.Game = {};
    if (!Game.leagues) Game.leagues = {};
    Game.leagues[div] = liga;
  },

  _getCurrentLeague() {
    if (!window.Game) window.Game = {};
    if (!Game.currentDivision) {
      const myTeam = this._getTeamById(Game.teamId);
      Game.currentDivision = (myTeam && myTeam.division) ? myTeam.division : "A";
    }
    if (!Game.leagues || !Game.leagues[Game.currentDivision]) {
      this.ensureState();
    }
    Game.league = Game.leagues[Game.currentDivision];
    return Game.league;
  },

  /* ============================
     INICIALIZAÇÃO / ESTADO
     ============================ */
  ensureState() {
    if (!window.Game) window.Game = {};
    if (!Game.seasonYear) Game.seasonYear = 2025;

    const teamsArr = this._getTeamsArray();
    if (!teamsArr.length) {
      console.error("[LEAGUE] Nenhum time encontrado no database.");
      return;
    }

    if (!Game.leagues) Game.leagues = {};

    if (!Game.leagues.A) {
      Game.leagues.A = this.criarLiga("A", Game.seasonYear);
    }
    if (!Game.leagues.B) {
      Game.leagues.B = this.criarLiga("B", Game.seasonYear);
    }

    if (!Game.teamId) {
      // ainda não escolheu time, apenas garante que a estrutura existe
      Game.currentDivision = "A";
    } else {
      const myTeam = this._getTeamById(Game.teamId);
      Game.currentDivision = (myTeam && myTeam.division) ? myTeam.division : "A";
    }

    Game.league = Game.leagues[Game.currentDivision];
  },

  criarLiga(division, seasonYear) {
    const participantes = this._getTeamsArray().filter(t => t.division === division);

    const tabela = participantes.map(t => ({
      teamId: t.id,
      pts: 0,
      j: 0,
      v: 0,
      e: 0,
      d: 0,
      gp: 0,
      gc: 0,
      sg: 0
    }));

    const fixtures = this.gerarTabelaJogos(participantes.map(t => t.id));

    return {
      division,
      seasonYear,
      rodadaAtual: 1,
      totalRodadas: fixtures.length,
      fixtures,            // [ [ {home, away, golsHome, golsAway, played}, ... ], ... ]
      tabela,
      ultimosResultados: [] // preenchido após cada rodada
    };
  },

  gerarTabelaJogos(teamIds) {
    const ids = [...teamIds];
    if (ids.length % 2 !== 0) {
      ids.push("BYE");
    }
    const n = ids.length;
    const rodadas = [];

    const metade = n / 2;
    const fixo = ids[0];
    let rotativos = ids.slice(1);

    // Turno
    for (let r = 0; r < n - 1; r++) {
      const matches = [];
      const esquerda = [fixo, ...rotativos.slice(0, metade - 1)];
      const direita = rotativos.slice(metade - 1).reverse();

      for (let i = 0; i < metade; i++) {
        const home = esquerda[i];
        const away = direita[i];
        if (home !== "BYE" && away !== "BYE") {
          matches.push({
            home,
            away,
            golsHome: null,
            golsAway: null,
            played: false
          });
        }
      }

      rodadas.push(matches);

      // Rotaciona
      rotativos = [rotativos[rotativos.length - 1], ...rotativos.slice(0, rotativos.length - 1)];
    }

    // Returno (inverte mandos)
    const returno = rodadas.map(r =>
      r.map(m => ({
        home: m.away,
        away: m.home,
        golsHome: null,
        golsAway: null,
        played: false
      }))
    );

    return [...rodadas, ...returno];
  },

  /* =======================================================
     PRÓXIMO JOGO DO JOGADOR
     =======================================================*/
  getProximoJogoDoJogador() {
    this.ensureState();
    const liga = this._getCurrentLeague();
    const myId = Game.teamId;

    for (let r = liga.rodadaAtual - 1; r < liga.fixtures.length; r++) {
      const rodada = liga.fixtures[r];
      for (let i = 0; i < rodada.length; i++) {
        const m = rodada[i];
        if (!m.played && (m.home === myId || m.away === myId)) {
          return { roundIndex: r, matchIndex: i, match: m };
        }
      }
    }

    return null; // acabou a temporada
  },

  /* =======================================================
     REGISTRAR RESULTADO DO JOGO DO JOGADOR
     =======================================================*/
  registrarResultado(roundIndex, matchIndex, golsHome, golsAway) {
    this.ensureState();
    const liga = this._getCurrentLeague();
    const rodada = liga.fixtures[roundIndex];
    const partida = rodada[matchIndex];

    partida.golsHome = golsHome;
    partida.golsAway = golsAway;
    partida.played = true;

    this.aplicarResultadoNaTabela(liga, partida.home, partida.away, golsHome, golsAway);

    // Simula automaticamente os outros jogos da rodada da MESMA divisão
    this.simularOutrasPartidasDaRodada(liga, roundIndex, matchIndex);

    // Atualiza lista de resultados da rodada para a tela específica
    liga.ultimosResultados = rodada.map(m => ({
      home: m.home,
      away: m.away,
      golsHome: m.golsHome,
      golsAway: m.golsAway
    }));

    // Se a rodada inteira foi jogada, avança
    if (rodada.every(m => m.played)) {
      liga.rodadaAtual = Math.min(liga.totalRodadas, roundIndex + 2);

      // Checa fim de temporada para ESSA divisão
      if (roundIndex + 1 === liga.totalRodadas) {
        this.encerrarTemporada();
      }
    }

    if (typeof window.salvarJogo === "function") {
      window.salvarJogo();
    }
  },

  aplicarResultadoNaTabela(liga, homeId, awayId, gH, gA) {
    const t = liga.tabela;

    const th = t.find(x => x.teamId === homeId);
    const ta = t.find(x => x.teamId === awayId);
    if (!th || !ta) return;

    th.j++; ta.j++;
    th.gp += gH; th.gc += gA;
    ta.gp += gA; ta.gc += gH;
    th.sg = th.gp - th.gc;
    ta.sg = ta.gp - ta.gc;

    if (gH > gA) {
      th.v++; th.pts += 3;
      ta.d++;
    } else if (gH < gA) {
      ta.v++; ta.pts += 3;
      th.d++;
    } else {
      th.e++; ta.e++;
      th.pts += 1;
      ta.pts += 1;
    }

    this._ordenarTabela(t);
  },

  simularOutrasPartidasDaRodada(liga, roundIndex, matchIndexDoJogador) {
    const rodada = liga.fixtures[roundIndex];

    for (let i = 0; i < rodada.length; i++) {
      if (i === matchIndexDoJogador) continue;
      const m = rodada[i];
      if (m.played) continue;

      const homeOverall = this._getTeamAverageOverall(m.home);
      const awayOverall = this._getTeamAverageOverall(m.away);

      const baseHome = homeOverall / 20;
      const baseAway = awayOverall / 20;

      const golsHome = Math.max(0, Math.round(baseHome + (Math.random() * 2 - 1)));
      const golsAway = Math.max(0, Math.round(baseAway + (Math.random() * 2 - 1)));

      m.golsHome = golsHome;
      m.golsAway = golsAway;
      m.played = true;

      this.aplicarResultadoNaTabela(liga, m.home, m.away, golsHome, golsAway);
    }
  },

  /* =======================================================
     DADOS PARA AS TELAS (TABELA E RESULTADOS)
     =======================================================*/
  getTabelaAtual() {
    this.ensureState();
    const liga = this._getCurrentLeague();
    return liga.tabela.map((row, idx) => ({
      pos: idx + 1,
      ...row
    }));
  },

  getUltimosResultados() {
    this.ensureState();
    const liga = this._getCurrentLeague();
    return liga.ultimosResultados || [];
  },

  getNomeTime(id) {
    const t = this._getTeamById(id);
    return t ? t.name : id;
  },

  getLogoTime(id) {
    const t = this._getTeamById(id);
    if (!t) return "assets/logos/default.png";
    return `assets/logos/${t.id}.png`;
  },

  /* =======================================================
     ENCERRAR TEMPORADA + PROMOÇÃO / REBAIXAMENTO
     =======================================================*/
  _simularRestanteLiga(liga) {
    for (let r = 0; r < liga.fixtures.length; r++) {
      const rodada = liga.fixtures[r];
      for (let i = 0; i < rodada.length; i++) {
        const m = rodada[i];
        if (m.played) continue;

        const homeOverall = this._getTeamAverageOverall(m.home);
        const awayOverall = this._getTeamAverageOverall(m.away);

        const baseHome = homeOverall / 20;
        const baseAway = awayOverall / 20;

        const golsHome = Math.max(0, Math.round(baseHome + (Math.random() * 2 - 1)));
        const golsAway = Math.max(0, Math.round(baseAway + (Math.random() * 2 - 1)));

        m.golsHome = golsHome;
        m.golsAway = golsAway;
        m.played = true;

        this.aplicarResultadoNaTabela(liga, m.home, m.away, golsHome, golsAway);
      }
      liga.ultimosResultados = rodada.map(j => ({
        home: j.home,
        away: j.away,
        golsHome: j.golsHome,
        golsAway: j.golsAway
      }));
    }
  },

  encerrarTemporada() {
    this.ensureState();

    // Garante que as duas ligas (A e B) terminem suas rodadas
    const ligaA = this._getLeagueForDivision("A");
    const ligaB = this._getLeagueForDivision("B");

    if (ligaA) this._simularRestanteLiga(ligaA);
    if (ligaB) this._simularRestanteLiga(ligaB);

    if (ligaA) this._ordenarTabela(ligaA.tabela);
    if (ligaB) this._ordenarTabela(ligaB.tabela);

    const campeaoA = ligaA && ligaA.tabela[0];
    const campeaoB = ligaB && ligaB.tabela[0];

    const nomeCampeaoA = campeaoA ? this.getNomeTime(campeaoA.teamId) : "—";
    const nomeCampeaoB = campeaoB ? this.getNomeTime(campeaoB.teamId) : "—";

    // Mensagens de campeão para o jogador
    if (Game.teamId && Game.currentDivision === "A" && campeaoA && campeaoA.teamId === Game.teamId) {
      alert(`🏆 CAMPEÃO BRASILEIRO SÉRIE A ${Game.seasonYear}!\n\nParabéns, ${nomeCampeaoA}!`);
    }
    if (Game.teamId && Game.currentDivision === "B" && campeaoB && campeaoB.teamId === Game.teamId) {
      alert(`🏆 CAMPEÃO BRASILEIRO SÉRIE B ${Game.seasonYear}!\n\nParabéns, ${nomeCampeaoB}!`);
    }

    // Mensagem geral da temporada
    alert(
      `Temporada ${Game.seasonYear} encerrada.\n` +
      `Campeão Série A: ${nomeCampeaoA}\n` +
      `Campeão Série B: ${nomeCampeaoB}`
    );

    // PROMOÇÃO E REBAIXAMENTO (4 sobem, 4 caem)
    const teamsArr = this._getTeamsArray();

    if (ligaA && ligaB && ligaA.tabela.length >= 4 && ligaB.tabela.length >= 4) {
      const rebaixadosA = ligaA.tabela.slice(-4);   // últimos 4
      const promovidosB = ligaB.tabela.slice(0, 4); // primeiros 4

      const setDiv = (teamId, div) => {
        const t = teamsArr.find(tt => tt.id === teamId);
        if (t) t.division = div;
      };

      rebaixadosA.forEach(row => setDiv(row.teamId, "B"));
      promovidosB.forEach(row => setDiv(row.teamId, "A"));
    }

    // Avança ano
    Game.seasonYear = (Game.seasonYear || 2025) + 1;

    // Recria ligas com divisões atualizadas
    const novaLigaA = this.criarLiga("A", Game.seasonYear);
    const novaLigaB = this.criarLiga("B", Game.seasonYear);
    this._setLeagueForDivision("A", novaLigaA);
    this._setLeagueForDivision("B", novaLigaB);

    // Atualiza divisão atual do jogador (ele pode ter subido ou caído)
    if (Game.teamId) {
      const myTeam = this._getTeamById(Game.teamId);
      Game.currentDivision = (myTeam && myTeam.division) ? myTeam.division : "A";
    } else {
      Game.currentDivision = "A";
    }
    Game.league = this._getLeagueForDivision(Game.currentDivision);

    alert(
      `Nova temporada: ${Game.seasonYear}.\n` +
      `Seu time disputará a ${Game.currentDivision === "A" ? "Série A" : "Série B"}.`
    );

    if (typeof window.salvarJogo === "function") {
      window.salvarJogo();
    }
  }
};
