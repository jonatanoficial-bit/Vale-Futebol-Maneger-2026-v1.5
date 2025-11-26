/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/database.js – Times, jogadores e competições
   =======================================================*/

// -------------------------------------------------------
// TIMES – Série A e Série B
// -------------------------------------------------------

const teams = [
  // Série A
  { id: "FLA", name: "Flamengo",        shortName: "Flamengo",    division: "A" },
  { id: "PAL", name: "Palmeiras",       shortName: "Palmeiras",   division: "A" },
  { id: "BOT", name: "Botafogo",        shortName: "Botafogo",    division: "A" },
  { id: "INT", name: "Internacional",   shortName: "Inter",       division: "A" },
  { id: "AMG", name: "Atlético-MG",     shortName: "Atl-MG",      division: "A" },
  { id: "COR", name: "Corinthians",     shortName: "Corinthians", division: "A" },
  { id: "SAO", name: "São Paulo",       shortName: "São Paulo",   division: "A" },
  { id: "FLU", name: "Fluminense",      shortName: "Fluminense",  division: "A" },
  { id: "GRE", name: "Grêmio",          shortName: "Grêmio",      division: "A" },
  { id: "SAN", name: "Santos",          shortName: "Santos",      division: "A" },
  { id: "CRU", name: "Cruzeiro",        shortName: "Cruzeiro",    division: "A" },
  { id: "VAS", name: "Vasco",           shortName: "Vasco",       division: "A" },
  { id: "BAH", name: "Bahia",           shortName: "Bahia",       division: "A" },
  { id: "FOR", name: "Fortaleza",       shortName: "Fortaleza",   division: "A" },
  { id: "RBB", name: "RB Bragantino",   shortName: "Bragantino",  division: "A" },
  { id: "CEA", name: "Ceará",           shortName: "Ceará",       division: "A" },
  { id: "SPT", name: "Sport",           shortName: "Sport",       division: "A" },
  { id: "JUV", name: "Juventude",       shortName: "Juventude",   division: "A" },
  { id: "VIT", name: "Vitória",         shortName: "Vitória",     division: "A" },
  { id: "MIR", name: "Mirassol",        shortName: "Mirassol",    division: "A" },

  // Série B
  { id: "CFC", name: "Coritiba",        shortName: "Coritiba",    division: "B" },
  { id: "CAP", name: "Athletico-PR",    shortName: "Athletico-PR",division: "B" },
  { id: "CHA", name: "Chapecoense",     shortName: "Chapecoense", division: "B" },
  { id: "REM", name: "Remo",            shortName: "Remo",        division: "B" },
  { id: "GOI", name: "Goiás",           shortName: "Goiás",       division: "B" },
  { id: "NOV", name: "Novorizontino",   shortName: "Novorizontino",division: "B" },
  { id: "CRB", name: "CRB",             shortName: "CRB",         division: "B" },
  { id: "AVA", name: "Avaí",            shortName: "Avaí",        division: "B" },
  { id: "CUI", name: "Cuiabá",          shortName: "Cuiabá",      division: "B" },
  { id: "ACG", name: "Atlético-GO",     shortName: "Atlético-GO", division: "B" },
  { id: "OPE", name: "Operário",        shortName: "Operário",    division: "B" },
  { id: "VNO", name: "Vila Nova",       shortName: "Vila Nova",   division: "B" },
  { id: "AME", name: "América-MG",      shortName: "América-MG",  division: "B" },
  { id: "ATC", name: "Athletic",        shortName: "Athletic",    division: "B" },
  { id: "BFS", name: "Botafogo-SP",     shortName: "Botafogo-SP", division: "B" },
  { id: "FER", name: "Ferroviária",     shortName: "Ferroviária", division: "B" },
  { id: "AMZ", name: "Amazonas",        shortName: "Amazonas",    division: "B" },
  { id: "VRD", name: "Volta Redonda",   shortName: "Volta Redonda",division: "B" },
  { id: "PAY", name: "Paysandu",        shortName: "Paysandu",    division: "B" },
  { id: "TOM", name: "Tombense",        shortName: "Tombense",    division: "B" }
];

// -------------------------------------------------------
// Função auxiliar para criar jogadores
// -------------------------------------------------------

function makePlayer(
  id,
  teamId,
  name,
  position,
  overall,
  value,
  age = 27,
  morale = 75,
  face = null
) {
  return {
    id,
    teamId,
    name,
    position,   // "GOL", "ZAG", "LD", "LE", "VOL", "MEI", "ATA"
    overall,    // 0–99
    age,
    morale,
    value,      // em "milhões"
    face        // ex: "assets/faces/FLA_PEDRO.png"
  };
}

// -------------------------------------------------------
// JOGADORES – aqui vamos colar todos os makePlayer(...)
// -------------------------------------------------------

const players = [
  // Aqui você cola TODOS os blocos que eu estou te mandando
  // Exemplo:
  // makePlayer("FLA_ROSSI","FLA","Agustín Rossi","GOL",83,22),
  // makePlayer("FLA_MATHEUS_CUNHA","FLA","Matheus Cunha","GOL",76,5),
];

// -------------------------------------------------------
// COMPETIÇÕES
// -------------------------------------------------------

const competitions = [
  {
    id: "BRA-A",
    name: "Campeonato Brasileiro Série A",
    type: "league",
    pointsForWin: 3,
    pointsForDraw: 1,
    pointsForLoss: 0,
    doubleRoundRobin: true
  },
  {
    id: "BRA-B",
    name: "Campeonato Brasileiro Série B",
    type: "league",
    pointsForWin: 3,
    pointsForDraw: 1,
    pointsForLoss: 0,
    doubleRoundRobin: true
  }
];

// -------------------------------------------------------
// HELPERS
// -------------------------------------------------------

function getTeamById(teamId) {
  return teams.find(t => t.id === teamId) || null;
}

function calcularValorPorOVR(ovr) {
  if (ovr >= 85) return 60;
  if (ovr >= 80) return 35;
  if (ovr >= 75) return 20;
  if (ovr >= 70) return 10;
  if (ovr >= 65) return 5;
  return 2;
}

// Se não houver elenco real cadastrado, gera um elenco padrão
function gerarElencoPadrao(team) {
  const baseOVR = team.division === "A" ? 76 : 70;
  const positions = [
    "GOL",
    "ZAG", "ZAG",
    "LE", "LD",
    "VOL", "VOL",
    "MEI", "MEI",
    "ATA", "ATA",
    "ATA", "MEI", "VOL", "ZAG", "ATA", "MEI", "GOL"
  ];

  return positions.map((pos, idx) => {
    const ovr = baseOVR + (Math.floor(Math.random() * 7) - 3); // variação -3 a +3
    return {
      id: `${team.id}_GEN_${idx + 1}`,
      teamId: team.id,
      name: `Jogador ${idx + 1}`,
      position: pos,
      overall: ovr,
      age: 20 + (idx % 10),
      morale: 75,
      value: calcularValorPorOVR(ovr),
      face: `assets/faces/${team.id}_GEN_${idx + 1}.png`
    };
  });
}

// Função usada pelo jogo para carregar elenco do time
function carregarElencoDoTime(teamId) {
  const team = getTeamById(teamId);
  if (!team) return [];

  const elencoReal = players.filter(p => p.teamId === teamId);
  if (elencoReal.length > 0) return elencoReal;

  // se não tiver jogadores reais cadastrados, gera elenco padrão
  return gerarElencoPadrao(team);
}

// Expor em um objeto global
window.Database = {
  teams,
  players,
  competitions,
  getTeamById,
  carregarElencoDoTime
};
