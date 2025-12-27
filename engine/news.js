/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/news.js — Feed de notícias (gameState.newsFeed)
   =======================================================*/

(function () {
  console.log("%c[News] news.js carregado", "color:#0EA5E9; font-weight:bold;");

  function ensureGameState() {
    if (!window.gameState) window.gameState = {};
    if (!Array.isArray(gameState.newsFeed)) gameState.newsFeed = [];
    return window.gameState;
  }

  function ts() {
    try { return new Date().toISOString(); } catch (e) { return ""; }
  }

  function pushNews(title, body, type) {
    const gs = ensureGameState();
    gs.newsFeed.push({
      at: ts(),
      title: String(title || "Notícia"),
      body: String(body || ""),
      type: String(type || "INFO"),
    });

    // limita tamanho do feed
    if (gs.newsFeed.length > 60) {
      gs.newsFeed = gs.newsFeed.slice(gs.newsFeed.length - 60);
    }
  }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }

  function teamName(id) {
    const t = getTeams().find(x => x.id === id);
    return t?.name || id;
  }

  function streakText(st) {
    if (!st) return "";
    if (st.streakW >= 3) return `Sequência de ${st.streakW} vitórias!`;
    if (st.streakL >= 3) return `Sequência de ${st.streakL} derrotas...`;
    if (st.streakD >= 3) return `Sequência de ${st.streakD} empates.`;
    return "";
  }

  function addMatchNews(report, dynamicsSummary) {
    ensureGameState();

    const home = teamName(report.homeId);
    const away = teamName(report.awayId);
    const placar = `${report.goalsHome} x ${report.goalsAway}`;

    // resultado do time do usuário (se estiver no jogo)
    const gs = window.gameState || {};
    const userTeamId = (gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null));

    let headline = `${home} ${placar} ${away}`;
    let body = `${report.competitionName || "Partida"} • ${report.roundLabel || ""}`.trim();

    pushNews(headline, body, "MATCH");

    // contexto por resultado (se tiver summary)
    if (dynamicsSummary) {
      const stHome = streakText(dynamicsSummary.home?.streak);
      const stAway = streakText(dynamicsSummary.away?.streak);

      if (stHome) pushNews(`${home}: ${stHome}`, "O momento do time chama atenção no campeonato.", "STREAK");
      if (stAway) pushNews(`${away}: ${stAway}`, "O momento do time chama atenção no campeonato.", "STREAK");

      // alerta de cansaço (do usuário)
      if (Array.isArray(dynamicsSummary.fatigueAlerts) && dynamicsSummary.fatigueAlerts.length) {
        const names = dynamicsSummary.fatigueAlerts.map(x => x.name).join(", ");
        pushNews("Alerta físico: elenco cansado", `Jogadores muito fatigados: ${names}. Considere rodar elenco e ajustar táticas.`, "FITNESS");
      }
    }

    // se o usuário jogou, adiciona uma manchete “emocional”
    if (userTeamId && (userTeamId === report.homeId || userTeamId === report.awayId)) {
      const gf = (userTeamId === report.homeId) ? report.goalsHome : report.goalsAway;
      const ga = (userTeamId === report.homeId) ? report.goalsAway : report.goalsHome;

      if (gf > ga) pushNews("Vitória importante!", `Seu time venceu por ${gf} x ${ga}. Moral e forma tendem a subir.`, "USER");
      else if (gf < ga) pushNews("Derrota preocupante", `Seu time perdeu por ${gf} x ${ga}. Ajuste elenco, tática e foco.`, "USER");
      else pushNews("Empate com lições", `Seu time empatou em ${gf} x ${ga}. Pequenos ajustes podem virar vitórias.`, "USER");
    }
  }

  function ensure() {
    ensureGameState();
    return window.gameState;
  }

  window.News = {
    ensure,
    addMatchNews,
    pushNews,
  };
})();