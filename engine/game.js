// ======================================================
// VALE FUTEBOL MANAGER 2026
// game.js (ENGINE)
// ------------------------------------------------------
// - Estado do jogo (gameState)
// - Geração de tabela / confrontos
// - Simulação de partidas
// - Classificação
// - Transferências
// - Salvamento / carregamento
// - Fim de temporada + subida/rebaixamento
// ======================================================

let gameState = {
  coachName: "",
  controlledTeamId: null,
  seasonYear: 2025,
  balance: 50,
  currentCompetitionId: "BRA-A",
  fixtures: [],
  standings: {},
  nextMatchIndex: null
};

// === helpers de times/jogadores (usam const teams, players do database.js)
function getTeamById(teamId) { /* ... */ }
function getPlayersByTeam(teamId) { /* ... */ }

// === classificação
function initStandings(teamIds) { /* ... */ }
function sortStandings(standingsObj) { /* ... */ }
function getLeagueStandings() { /* ... */ }

// === tabela
function generateLeagueFixtures(teamIds, competitionId = "BRA-A") { /* ... */ }
function getCompetitionFixtures(competitionId) { /* ... */ }

// === simulação de partidas
function getTeamStrength(teamId) { /* ... */ }
function getNextMatchForControlledTeam() { /* ... */ }
function updateStandingsWithMatch(match) { /* ... */ }
function simulateMatchByIndex(index) { /* ... */ }
function simulateMatchForControlledTeam() { /* ... */ }

// === mercado de transferências
function getTransferList() { /* ... */ }
function buyPlayerById(playerId) { /* ... */ }

// === salvar / carregar
function saveGameState() { /* ... */ }
function loadGameState() { /* ... */ }

// === novo jogo / início de carreira
function resetGameStateForNewCareer(teamId, coachName) { /* ... */ }

// === fim de temporada / nova temporada
function finalizarTemporada() { /* ... */ }
function iniciarNovaTemporada() { /* ... */ }
