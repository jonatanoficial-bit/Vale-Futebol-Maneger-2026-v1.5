// /src/domain/matchSim.js
// Simulador MVP: usa força média do time (overall) + fator casa + aleatoriedade controlada.
// Retorna placar e "match report" simples.

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return (x >>> 0) / 4294967296;
  };
}

function avgOverall(players) {
  const a = Array.isArray(players) ? players : [];
  if (!a.length) return 65;
  const sum = a.reduce((s, p) => s + (Number(p?.overall) || 65), 0);
  return sum / a.length;
}

function poisson(lam, r) {
  // Poisson simples por inversão (ok para lam baixa/moderada)
  const L = Math.exp(-lam);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= r();
  } while (p > L && k < 20);
  return k - 1;
}

export function simulateMatch({
  homeId,
  awayId,
  homePlayers = [],
  awayPlayers = [],
  seedKey = "match"
}) {
  const r = rng(hashString(`${seedKey}:${homeId}vs${awayId}:${Date.now()}`));

  const homeOvr = avgOverall(homePlayers);
  const awayOvr = avgOverall(awayPlayers);

  // vantagem de casa pequena
  const homeAdv = 1.5;

  // diferença de força vira tendência de gols
  const diff = (homeOvr + homeAdv) - awayOvr; // pode ser negativo

  // lambdas (gols esperados)
  const base = 1.15;
  const homeLam = clamp(base + diff * 0.05 + (r() - 0.5) * 0.15, 0.2, 3.2);
  const awayLam = clamp(base - diff * 0.05 + (r() - 0.5) * 0.15, 0.2, 3.2);

  const homeGoals = poisson(homeLam, r);
  const awayGoals = poisson(awayLam, r);

  // “momentos” simples
  const chances = clamp(Math.round((homeLam + awayLam) * 6 + r() * 2), 6, 20);

  return {
    home: { id: homeId, ovr: Math.round(homeOvr) },
    away: { id: awayId, ovr: Math.round(awayOvr) },
    score: { home: homeGoals, away: awayGoals },
    meta: {
      chances,
      homeLam: Number(homeLam.toFixed(2)),
      awayLam: Number(awayLam.toFixed(2))
    }
  };
}
