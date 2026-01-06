import { rngFromString, int, shuffle } from "../competitions/rng.js";
import { computeOverall } from "../playerModel.js";
import { getPlayerStatus } from "../training/playerStatus.js";

function tierHeuristic(clubId) {
  const A = new Set(["FLA","PAL","COR","SAO","SAN","SPT","GRE","INT","CAM","CRU","VAS","BOT","FLU","CAP"]);
  const B = new Set(["BAH","FOR","CEA","CFC","GOI","RBB","AMG","AME","VIT","ACG","AVA","CRB"]);
  if (A.has(clubId)) return "A";
  if (B.has(clubId)) return "B";
  return "C";
}

function baseOverallForTier(tier) {
  if (tier === "A") return { min: 68, max: 84 };
  if (tier === "B") return { min: 64, max: 79 };
  return { min: 60, max: 75 };
}

function genName(rng) {
  const first = ["João","Pedro","Lucas","Mateus","Rafael","Bruno","Diego","Arthur","Caio","Gustavo","Felipe","Igor","André","Vitor","Renato","Rodrigo","Marcelo","Murilo","Wesley","Henrique"];
  const last = ["Silva","Santos","Oliveira","Souza","Lima","Pereira","Costa","Ferreira","Rodrigues","Almeida","Gomes","Carvalho","Ribeiro","Barbosa","Martins","Araújo","Melo","Teixeira","Nunes","Cardoso"];
  return `${first[Math.floor(rng() * first.length)]} ${last[Math.floor(rng() * last.length)]}`;
}

function genPositionsPlan() {
  return [
    "GK","GK",
    "RB","LB","CB","CB","CB","RB","LB","CB",
    "CDM","CM","CM","CAM","LM","RM","CM","CDM",
    "ST","ST","LW","RW","ST"
  ];
}

function wageForOverall(ovr) {
  const base = Math.max(15000, Math.round((ovr - 50) * 5000));
  return Math.round(base / 1000) * 1000;
}

export function makeGeneratedPlayer({ seedKey, clubId, idx, position, tier }) {
  const rng = rngFromString(`${seedKey}::P::${clubId}::${idx}::${position}`);
  const range = baseOverallForTier(tier);
  const overall = int(rng, range.min, range.max);
  const age = int(rng, 18, 34);

  return {
    id: `GEN_${clubId}_${String(idx).padStart(3, "0")}`,
    name: genName(rng),
    nationality: "Brasil",
    age,
    positions: [position],
    overall,
    potential: Math.min(90, overall + int(rng, 0, 8)),
    wageMonthly: wageForOverall(overall),
    value: Math.round((overall * overall) * 1200),
    faceAssetId: null,
    generated: true,
    clubId
  };
}

export function deriveUserSquad({ pack, state }) {
  const clubId = state.career?.clubId;
  const packId = state.app?.selectedPackId || "pack";
  const seedKey = `${packId}::SQUAD_BASE`;

  const base = (pack?.indexes?.playersByClub?.get(clubId) || []).map(p => ({
    ...p,
    overall: p.overall ?? computeOverall(p),
    wageMonthly: p.wageMonthly ?? 0,
    value: p.value ?? 0
  }));

  const signed = state.career?.roster?.signedPlayers || [];
  const released = new Set(state.career?.roster?.releasedIds || []);

  let squad = base.filter(p => !released.has(p.id));

  if (squad.length === 0) {
    const tier = tierHeuristic(clubId);
    const plan = genPositionsPlan();
    squad = plan.map((pos, i) => makeGeneratedPlayer({ seedKey, clubId, idx: i + 1, position: pos, tier }));
  }

  const map = new Map(squad.map(p => [p.id, p]));
  for (const p of signed) map.set(p.id, p);

  for (const id of released) map.delete(id);

  const out = Array.from(map.values()).map(p => ({
    ...p,
    status: getPlayerStatus(state, p.id)
  }));

  return out;
}

export function rosterStats(squad) {
  if (!squad.length) return { avg: 0, wage: 0, size: 0 };
  const avg = Math.round(squad.reduce((a, p) => a + (p.overall || 0), 0) / squad.length);
  const wage = squad.reduce((a, p) => a + (p.wageMonthly || 0), 0);
  return { avg, wage, size: squad.length };
}

export function autoPickFromMarket(rng, market, count) {
  const shuffled = shuffle(rng, market);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}