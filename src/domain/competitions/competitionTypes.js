// /src/domain/competitions/competitionTypes.js
// Tipos oficiais de competição no motor do jogo.
// v0.9.0 adiciona suporte a competições com Fase de Grupos + Mata-mata (Libertadores/Sul-Americana).

export const CompetitionType = Object.freeze({
  LEAGUE: "LEAGUE",          // pontos corridos
  CUP: "CUP",                // mata-mata simples
  GROUPS_CUP: "GROUPS_CUP"   // ✅ fase de grupos + mata-mata
});