// Gera elenco automático determinístico (não quebra o projeto e não depende de API).
// Importante: sempre gera o MESMO elenco para o mesmo (packId + clubId).
// Isso permite jogar mesmo sem database completa de players.

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return h >>> 0;
  };
}

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function int(rng, a, b) {
  return Math.floor(rng() * (b - a + 1)) + a;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function birthDateISOFromAge(rng, age) {
  const now = new Date();
  const year = now.getFullYear() - age;
  const month = int(rng, 1, 12);
  const day = int(rng, 1, 28);
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function clubStrengthFromId(clubId) {
  // Heurística simples: “grandes” recebem base maior.
  // Você pode evoluir isso depois via pack (club.rating etc).
  const elite = new Set(["FLA", "PAL", "COR", "SAO", "SAN", "SPT", "GRE", "INT", "CRU", "CAM", "VAS", "BOT", "FLU"]);
  const strong = new Set(["CAP", "BAH", "FOR", "CEA", "CFC", "GOI", "RBB", "AMG", "AME", "VIT"]);
  if (elite.has(clubId)) return 76;
  if (strong.has(clubId)) return 72;
  return 68;
}

function genName(rng) {
  const first = [
    "Lucas", "Mateus", "Gabriel", "Pedro", "Rafael", "Bruno", "Caio", "Vitor", "Felipe", "Guilherme",
    "Diego", "Arthur", "João", "Miguel", "Henrique", "Renato", "André", "Luan", "Eduardo", "Daniel"
  ];
  const last = [
    "Silva", "Souza", "Oliveira", "Santos", "Ferreira", "Pereira", "Lima", "Costa", "Carvalho", "Almeida",
    "Barbosa", "Ribeiro", "Gomes", "Martins", "Araújo", "Rocha", "Mendes", "Teixeira", "Correia", "Cardoso"
  ];
  const nickChance = rng();
  if (nickChance < 0.18) return pick(rng, first);
  return `${pick(rng, first)} ${pick(rng, last)}`;
}

function genFoot(rng) {
  const v = rng();
  if (v < 0.22) return "L";
  return "R";
}

function genHeight(rng, pos) {
  if (pos === "GK") return int(rng, 186, 200);
  if (pos === "CB") return int(rng, 182, 195);
  if (pos === "ST") return int(rng, 176, 192);
  return int(rng, 168, 188);
}

function genOutfieldAttrs(rng, base, pos) {
  // base ~ 68-76
  // Ajustes leves por posição para ficar com cara de jogo real.
  let pac = int(rng, base - 10, base + 10);
  let sho = int(rng, base - 10, base + 10);
  let pas = int(rng, base - 10, base + 10);
  let dri = int(rng, base - 10, base + 10);
  let def = int(rng, base - 10, base + 10);
  let phy = int(rng, base - 10, base + 10);

  if (pos === "ST" || pos === "RW" || pos === "LW") {
    pac += 6; sho += 6; def -= 8;
  } else if (pos === "CAM") {
    pas += 7; dri += 6; def -= 6;
  } else if (pos === "CM") {
    pas += 4; phy += 2;
  } else if (pos === "CDM") {
    def += 8; phy += 4; sho -= 6;
  } else if (pos === "CB") {
    def += 10; phy += 6; pac -= 6; dri -= 6; sho -= 10;
  } else if (pos === "RB" || pos === "LB") {
    pac += 5; def += 5; pas += 2;
  }

  return {
    pac: clamp(pac, 35, 92),
    sho: clamp(sho, 25, 92),
    pas: clamp(pas, 25, 92),
    dri: clamp(dri, 25, 92),
    def: clamp(def, 25, 92),
    phy: clamp(phy, 25, 92)
  };
}

function genGkAttrs(rng, base) {
  const div = int(rng, base - 8, base + 10);
  const han = int(rng, base - 8, base + 10);
  const kic = int(rng, base - 10, base + 8);
  const ref = int(rng, base - 8, base + 12);
  const spe = int(rng, 35, 60);
  const pos = int(rng, base - 8, base + 10);
  return {
    gk_div: clamp(div, 35, 92),
    gk_han: clamp(han, 35, 92),
    gk_kic: clamp(kic, 35, 92),
    gk_ref: clamp(ref, 35, 92),
    gk_spe: clamp(spe, 25, 75),
    gk_pos: clamp(pos, 35, 92)
  };
}

function genPositionsPool() {
  // Distribuição “padrão de elenco”:
  // 3 GK, 8 DEF, 9 MID, 5 FWD = 25 (você pode ajustar)
  return [
    "GK","GK","GK",
    "CB","CB","CB","RB","LB","CB","RB","LB",
    "CDM","CDM","CM","CM","CM","CAM","CAM","LM","RM",
    "ST","ST","RW","LW","ST"
  ];
}

export function generateAutoRoster({ packId, clubId, nationalityIdDefault = "BRA" }) {
  const seedFn = xmur3(`${packId}::${clubId}::AUTO_ROSTER_2025_26`);
  const rng = mulberry32(seedFn());

  const base = clubStrengthFromId(clubId);
  const pool = genPositionsPool();

  const players = [];
  for (let i = 0; i < pool.length; i++) {
    const pos = pool[i];
    const age = int(rng, 18, 35);
    const birthDate = birthDateISOFromAge(rng, age);

    const name = genName(rng);
    const foot = genFoot(rng);
    const height = genHeight(rng, pos);

    let positions;
    if (pos === "CB") positions = ["CB"];
    else if (pos === "RB") positions = ["RB"];
    else if (pos === "LB") positions = ["LB"];
    else if (pos === "CDM") positions = ["CDM", "CM"];
    else if (pos === "CM") positions = ["CM"];
    else if (pos === "CAM") positions = ["CAM", "CM"];
    else if (pos === "LM") positions = ["LM", "LW"];
    else if (pos === "RM") positions = ["RM", "RW"];
    else if (pos === "RW") positions = ["RW", "RM"];
    else if (pos === "LW") positions = ["LW", "LM"];
    else if (pos === "ST") positions = ["ST"];
    else positions = [pos];

    const attr = pos === "GK"
      ? genGkAttrs(rng, base - 2)
      : genOutfieldAttrs(rng, base - 2, pos);

    const id = `${clubId}_AUTO_${String(i + 1).padStart(3, "0")}`;

    players.push({
      id,
      name,
      nationalityId: nationalityIdDefault,
      clubId,
      birthDate,
      heightCm: height,
      preferredFoot: foot,
      positions,
      attributes: attr
    });
  }

  return players;
}