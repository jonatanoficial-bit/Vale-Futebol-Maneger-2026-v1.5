import { computeOverall } from "../playerModel.js";

function rngFromString(seed) {
  let x = 0;
  for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;
  return function () {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return (x >>> 0) / 4294967296;
  };
}

function int(rng, a, b) {
  return a + Math.floor(rng() * (b - a + 1));
}

function genName(rng) {
  const first = ["João","Pedro","Lucas","Mateus","Rafael","Bruno","Diego","Arthur","Caio","Gustavo","Felipe","Igor","André","Vitor","Renato","Rodrigo","Marcelo","Murilo","Wesley","Henrique"];
  const last = ["Silva","Santos","Oliveira","Souza","Lima","Pereira","Costa","Ferreira","Rodrigues","Almeida","Gomes","Carvalho","Ribeiro","Barbosa","Martins","Araújo","Melo","Teixeira","Nunes","Cardoso"];
  return `${first[Math.floor(rng() * first.length)]} ${last[Math.floor(rng() * last.length)]}`;
}

function wageForOverall(ovr) {
  const base = Math.max(18_000, Math.round((ovr - 50) * 6_000));
  return Math.round(base / 1000) * 1000;
}

function valueForOverall(ovr, age) {
  const ageFactor = age <= 23 ? 1.35 : age <= 28 ? 1.15 : 0.95;
  return Math.round((ovr * ovr) * 1200 * ageFactor);
}

function positionsPool() {
  return ["GK","RB","LB","CB","CDM","CM","CAM","RM","LM","RW","LW","ST"];
}

export function ensureTransferState(state) {
  const next = structuredClone(state);
  if (!next.career) next.career = {};
  if (!next.career.transfers) {
    next.career.transfers = {
      marketSeed: "GLOBAL",
      market: [],
      offers: [], // propostas enviadas pelo usuário
      inbox: []   // propostas recebidas (venda) — MVP future
    };
  } else {
    if (!Array.isArray(next.career.transfers.market)) next.career.transfers.market = [];
    if (!Array.isArray(next.career.transfers.offers)) next.career.transfers.offers = [];
    if (!Array.isArray(next.career.transfers.inbox)) next.career.transfers.inbox = [];
    if (!next.career.transfers.marketSeed) next.career.transfers.marketSeed = "GLOBAL";
  }
  return next;
}

export function generateMarket({ packId, clubId, weekKey, count = 40 }) {
  const seed = `${packId}::${clubId}::MARKET::${weekKey}`;
  const rng = rngFromString(seed);
  const pos = positionsPool();

  const market = [];
  for (let i = 0; i < count; i++) {
    const p = pos[int(rng, 0, pos.length - 1)];
    const ovr = int(rng, 60, 84);
    const age = int(rng, 18, 34);
    const id = `MKT_${weekKey.replaceAll("-", "")}_${String(i + 1).padStart(3, "0")}`;

    market.push({
      id,
      name: genName(rng),
      nationality: "Brasil",
      age,
      positions: [p],
      overall: ovr,
      potential: Math.min(90, ovr + int(rng, 0, 8)),
      wageMonthly: wageForOverall(ovr),
      value: valueForOverall(ovr, age),
      faceAssetId: null,
      generated: true,
      clubId: null, // free agent market (MVP)
      source: "FREE_AGENT"
    });
  }

  return market;
}

export function createOffer({ player, fee, wageMonthly, years }) {
  return {
    id: `OFF_${player.id}_${Date.now()}`,
    playerId: player.id,
    playerSnapshot: player,
    fee: Math.max(0, Math.round(fee)),
    wageMonthly: Math.max(0, Math.round(wageMonthly)),
    years: Math.max(1, Math.min(5, Math.round(years))),
    status: "PENDING", // ACCEPTED | REJECTED
    createdAt: new Date().toISOString()
  };
}

export function evaluateOffer({ player, offer, clubReputation = 0.5 }) {
  // Probabilidade simples e realista:
  // - salário acima do esperado aumenta chance
  // - taxa acima do valor aumenta chance (para clubes vendedores)
  // Aqui como FREE_AGENT, peso maior no salário.
  const expectedWage = player.wageMonthly || wageForOverall(player.overall ?? computeOverall(player));
  const wageRatio = offer.wageMonthly / Math.max(1, expectedWage);

  let p = 0.35;
  p += (wageRatio - 1.0) * 0.35;          // salário pesa muito
  p += (clubReputation - 0.5) * 0.20;     // reputação leve
  p -= (player.overall - 75) * 0.01;      // jogador melhor exige mais
  p = Math.max(0.05, Math.min(0.90, p));

  // determinístico pela id
  const rng = rngFromString(`${offer.id}::EVAL`);
  const roll = rng();

  return { accepted: roll < p, probability: p, roll };
}