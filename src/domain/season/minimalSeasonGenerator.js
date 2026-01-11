// src/domain/season/minimalSeasonGenerator.js

export function generateMinimalSeason(clubs) {
  const competitionId = "league_brazil_demo";

  const standings = clubs.map((club) => ({
    clubId: club.id,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));

  const matches = [];
  for (let i = 0; i < clubs.length - 1; i++) {
    for (let j = i + 1; j < clubs.length; j++) {
      matches.push({
        id: `M_${clubs[i].id}_${clubs[j].id}`,
        home: clubs[i].id,
        away: clubs[j].id,
        played: false,
        score: null,
      });
    }
  }

  return {
    seasonLabel: "2025/2026",
    competitions: [
      {
        id: competitionId,
        name: "Brasileirão Demo",
        type: "league",
        standings,
        matches,
      },
    ],
  };
}