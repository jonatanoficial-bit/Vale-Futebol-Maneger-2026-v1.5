// /src/domain/autoPlayers.js
// Gera jogadores automáticos (MVP) quando o pack não possui players.json.
// Resultado: players com clubId correto, overall coerente e distribuição de posições.

function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rng(seed) {
  // xorshift32
  let x = seed >>> 0;
  return () => {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return (x >>> 0) / 4294967296;
  };
}

function pick(arr, r) {
  return arr[Math.floor(r() * arr.length)];
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function normalizeClubId(club) {
  return club?.id || club?.code || club?.slug || club?.abbrev || club?.short || null;
}

function clubTierGuess(club) {
  // Palpite simples por liga/divisão quando existir no pack (não quebra se não existir)
  const div =
    club?.division ??
    club?.leagueLevel ??
    club?.tier ??
    club?.serie ??
    null;

  const v = String(div ?? "").toUpperCase();
  if (v.includes("A") || v.includes("1")) return 1;
  if (v.includes("B") || v.includes("2")) return 2;
  if (v.includes("C") || v.includes("3")) return 3;
  return 2;
}

function overallByPosAndTier(pos, tier, r) {
  // Faixas aproximadas (MVP), tier 1 mais forte
  const base =
    tier === 1 ? 74 :
    tier === 2 ? 69 :
    65;

  const posMod =
    pos === "GK" ? 0 :
    pos === "CB" ? 1 :
    pos === "LB" || pos === "RB" ? 0 :
    pos === "DM" ? 1 :
    pos === "CM" ? 0 :
    pos === "AM" ? 1 :
    pos === "LW" || pos === "RW" ? 1 :
    pos === "ST" ? 2 :
    0;

  // dispersão
  const spread = tier === 1 ? 12 : tier === 2 ? 10 : 9;
  const raw = base + posMod + Math.floor((r() - 0.4) * spread);
  return clamp(raw, 50, 88);
}

const FIRST = [
  "João","Pedro","Lucas","Mateus","Gabriel","Rafael","Bruno","Gustavo","Felipe","Arthur",
  "Caio","Diego","Vitor","Renan","Igor","Marcos","Thiago","Danilo","Rodrigo","Henrique"
];

const LAST = [
  "Silva","Souza","Oliveira","Santos","Pereira","Lima","Carvalho","Ferreira","Ribeiro","Almeida",
  "Costa","Gomes","Martins","Rocha","Barbosa","Melo","Cardoso","Correia","Teixeira","Araujo"
];

function genName(r) {
  return `${pick(FIRST, r)} ${pick(LAST, r)}`;
}

function genPositions() {
  // 26 jogadores: 3 GK, 9 DEF, 9 MID, 5 FWD (bem padrão)
  return [
    "GK","GK","GK",
    "CB","CB","CB","CB",
    "LB","LB",
    "RB","RB",
    "DM","DM",
    "CM","CM","CM","CM",
    "AM","AM",
    "LW","LW",
    "RW","RW",
    "ST","ST"
  ];
}

export function generateAutoPlayers({ clubs, defaultCountry = "Brasil" }) {
  const out = [];
  const positions = genPositions();

  for (const club of clubs || []) {
    const id = normalizeClubId(club);
    if (!id) continue;

    const tier = clubTierGuess(club);
    const seed = hashString(String(id));
    const r = rng(seed);

    const country = club?.country || club?.nation || club?.pais || defaultCountry;

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const ovr = overallByPosAndTier(pos, tier, r);
      const age = clamp(17 + Math.floor(r() * 20), 17, 37);

      out.push({
        id: `${id}-${String(i + 1).padStart(2, "0")}`,
        name: genName(r),
        country,
        age,
        position: pos,
        overall: ovr,
        clubId: id
      });
    }
  }

  return out;
}
