// src/domain/rosterGenerator.js

const POSITIONS = ["GK", "RB", "CB", "CB", "LB", "DM", "CM", "CM", "RW", "LW", "ST"];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateRosterForClub(clubId) {
  const players = [];

  for (let i = 0; i < 18; i++) {
    const position = POSITIONS[i % POSITIONS.length];

    players.push({
      id: `${clubId}_P${i + 1}`,
      clubId,
      name: `Jogador ${i + 1}`,
      position,
      age: randomBetween(18, 34),
      overall: randomBetween(60, 78),
      stamina: randomBetween(60, 90),
      morale: 70,
      isStarter: i < 11,
    });
  }

  return players;
}