import { computeOverall } from "./playerModel.js";

export const FORMATIONS = [
  {
    id: "4-3-3",
    name: "4-3-3",
    slots: ["GK","RB","CB1","CB2","LB","CM1","CM2","CM3","RW","ST","LW"]
  },
  {
    id: "4-2-3-1",
    name: "4-2-3-1",
    slots: ["GK","RB","CB1","CB2","LB","CDM1","CDM2","RAM","CAM","LAM","ST"]
  },
  {
    id: "4-4-2",
    name: "4-4-2",
    slots: ["GK","RB","CB1","CB2","LB","RM","CM1","CM2","LM","ST1","ST2"]
  },
  {
    id: "3-5-2",
    name: "3-5-2",
    slots: ["GK","CB1","CB2","CB3","RM","CM1","CM2","CAM","LM","ST1","ST2"]
  }
];

export function getFormation(id) {
  return FORMATIONS.find(f => f.id === id) || FORMATIONS[0];
}

export function createDefaultLineup() {
  return {
    formationId: "4-3-3",
    starters: {}, // { slotKey: playerId }
    bench: []     // ids
  };
}

export function validateLineup(lineup) {
  if (!lineup || typeof lineup !== "object") return { ok: false, reason: "Lineup inválido." };
  if (!lineup.formationId) return { ok: false, reason: "formationId ausente." };
  const formation = getFormation(lineup.formationId);
  const starters = lineup.starters || {};
  const picked = formation.slots.map(k => starters[k]).filter(Boolean);
  const set = new Set(picked);
  if (picked.length !== formation.slots.length) return { ok: false, reason: "Escalação incompleta (11 titulares)." };
  if (set.size !== picked.length) return { ok: false, reason: "Jogador repetido na escalação." };
  return { ok: true, reason: "OK" };
}

export function computeTeamRating({ formationId, starters }, playersById) {
  const formation = getFormation(formationId);
  const ids = formation.slots.map(k => starters?.[k]).filter(Boolean);
  if (ids.length === 0) return 0;

  let sum = 0;
  let count = 0;
  for (const id of ids) {
    const p = playersById.get(id);
    if (!p) continue;
    const overall = p.overall ?? computeOverall(p);
    sum += overall;
    count++;
  }
  if (count === 0) return 0;
  return Math.round(sum / count);
}