/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/league.js – Controle de ligas (Série A e B)
   =======================================================*/

window.League = {
  // Estado da liga fica dentro do Game
  ensureState() {
    if (!window.Game) window.Game = {};
    if (!Game.seasonYear) Game.seasonYear = 2025;

    // Se já existir liga inicializada, só garante consistência
    if (Game.league && Game.league.division && Game.league.tabela) {
      return;
    }

    // Descobre divisão do time escolhido
    if (!Database || !Database.teams) {
      console.error("[LEAGUE] Database não carregado.");
      return;
    }

    const myTeam = Database.getTeamById(Game.teamId);
    if (!myTeam) {
      console.error("[LEAGUE] Time do jogador não encontrado.");
      return;
    }

    const division = myTeam.division || "A";

    // Cria liga para aquela divisão
    Game.league = this.criarLiga(division, Game.seasonYear);
  },

  // Cria uma nova liga para a divisão (A ou B)
  criarLiga(division, seasonYear) {
    const participantes = Database.teams.filter(t => t.division === division);

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
      fixtures,      // [ [ {home, away, golsHome, golsAway, played}, ... ], ... ]
      tabela,        // array com estatísticas
      ultimosResultados: []  // preenchido após cada rodada
    };
  },

  // Gera turno e returno (método do círculo)
  gerarTabelaJogos(teamIds) {
    const ids = [...teamIds];
    if (ids.length % 2 !== 0) {
      ids.push("BYE"); // caso ímpar (não deve ser, mas por segurança)
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
     Próximo jogo do jogador dentro do calendário
     =======================================================*/
  getProximoJogoDoJogador() {
    this.ensureState();
    const liga = Game.league;
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
     Registrar resultado da partida do jogador
     =======================================================*/
  registrarResultado(roundIndex, matchIndex, golsHome, golsAway) {
    const liga = Game.league;
    const rodada = liga.fixtures[roundIndex];
    const partida = rodada[matchIndex];

    partida.golsHome = golsHome;
    partida.golsAway = golsAway;
    partida.played = true;

    this.aplicarResultadoNaTabela(partida.home, partida.away, golsHome, golsAway);

    // Simula automaticamente os outros jogos da rodada (da mesma divisão)
    this.simularOutrasPartidasDaRodada(roundIndex, matchIndex);

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

      // Checa fim de temporada
      if (roundIndex + 1 === liga.totalRodadas) {
        this.encerrarTemporada();
      }
    }

    if (typeof salvarJogo === "function") {
      salvarJogo();
    }
  },

  aplicarResultadoNaTabela(homeId, awayId, gH, gA) {
    const t = Game.league.tabela;

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

    // Ordena tabela
    t.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const sgA = a.sg, sgB = b.sg;
      if (sgB !== sgA) return sgB - sgA;
      if (b.gp !== a.gp) return b.gp - a.gp;

      const ta = Database.getTeamById(a.teamId);
      const tb = Database.getTeamById(b.teamId);
      return (ta.name || "").localeCompare(tb.name || "");
    });
  },

  // Simula os outros jogos da rodada com resultados simples baseados em overall médio
  simularOutrasPartidasDaRodada(roundIndex, matchIndexDoJogador) {
    const liga = Game.league;
    const rodada = liga.fixtures[roundIndex];

    for (let i = 0; i < rodada.length; i++) {
      if (i === matchIndexDoJogador) continue;
      const m = rodada[i];
      if (m.played) continue;

      const homeOverall = Database.getTeamAverageOverall(m.home);
      const awayOverall = Database.getTeamAverageOverall(m.away);

      const baseHome = homeOverall / 20; // 70 -> 3.5
      const baseAway = awayOverall / 20;

      const golsHome = Math.max(0, Math.round(baseHome + (Math.random() * 2 - 1)));
      const golsAway = Math.max(0, Math.round(baseAway + (Math.random() * 2 - 1)));

      m.golsHome = golsHome;
      m.golsAway = golsAway;
      m.played = true;

      this.aplicarResultadoNaTabela(m.home, m.away, golsHome, golsAway);
    }
  },

  /* =======================================================
     Dados para as telas
     =======================================================*/
  getTabelaAtual() {
    this.ensureState();
    return Game.league.tabela.map((row, idx) => ({
      pos: idx + 1,
      ...row
    }));
  },

  getUltimosResultados() {
    this.ensureState();
    return Game.league.ultimosResultados || [];
  },

  getNomeTime(id) {
    const t = Database.getTeamById(id);
    return t ? t.name : id;
  },

  getLogoTime(id) {
    const t = Database.getTeamById(id);
    if (!t) return "assets/logos/default.png";
    return `assets/logos/${t.id}.png`;
  },

  /* =======================================================
     Fim de temporada (versão simples)
     =======================================================*/
  encerrarTemporada() {
    const liga = Game.league;
    const tabela = this.getTabelaAtual();
    const campeao = tabela[0];

    if (campeao) {
      const time = Database.getTeamById(campeao.teamId);
      const nomeTime = time ? time.name : campeao.teamId;
      alert(`🏆 ${liga.division === "A" ? "Campeão Brasileiro Série A" : "Campeão Brasileiro Série B"} ${liga.seasonYear}\n\n${nomeTime} foi o campeão!`);
    }

    // Próxima temporada (simples: reinicia tudo, ainda sem promover/rebaixar)
    liga.seasonYear++;
    Game.seasonYear = liga.seasonYear;
    alert(`Nova temporada: ${Game.seasonYear}. Calendário reiniciado.`);

    // Recria a liga para mesma divisão; promoção/rebaixamento pode ser adicionado depois
    const novaLiga = this.criarLiga(liga.division, liga.seasonYear);
    Game.league = novaLiga;

    if (typeof salvarJogo === "function") {
      salvarJogo();
    }
  }
};
