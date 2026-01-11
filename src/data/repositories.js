// src/data/repositories.js
// Repositórios de dados (packs/DLC) + saves + helpers de assets.

async function safeFetchJson(url, fallback) {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return fallback;
    return await res.json();
  } catch (_err) {
    return fallback;
  }
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.packs)) return value.packs;
  if (value && Array.isArray(value.dataPacks)) return value.dataPacks;
  return [];
}

const FALLBACK_PACKS_INDEX = [
  { id: "base-2025-26", title: "Base 2025/2026 (Brasil MVP)", description: "Recomendado" },
];

const FALLBACK_PACK = {
  id: "base-2025-26",
  name: "Base 2025/2026 (Brasil MVP)",
  content: { clubs: [], players: [] },
};

// Nations mínimas (pra não quebrar careerCreate)
const FALLBACK_NATIONS = [
  { id: "BRA", name: "Brasil" },
  { id: "ARG", name: "Argentina" },
  { id: "URU", name: "Uruguai" },
  { id: "CHI", name: "Chile" },
  { id: "COL", name: "Colômbia" },
  { id: "PAR", name: "Paraguai" },
  { id: "PER", name: "Peru" },
  { id: "ECU", name: "Equador" },
  { id: "BOL", name: "Bolívia" },
  { id: "VEN", name: "Venezuela" },
];

function ensurePackShape(raw, fallbackId) {
  const pack = raw?.pack ?? raw ?? {};
  const id = pack.id ?? fallbackId;

  const name = pack.name ?? pack.title ?? id;

  const content = pack.content && typeof pack.content === "object" ? pack.content : {};
  const clubs = Array.isArray(content.clubs) ? content.clubs : (Array.isArray(pack.clubs) ? pack.clubs : []);
  const players = Array.isArray(content.players) ? content.players : (Array.isArray(pack.players) ? pack.players : []);

  // manifest e nations para careerCreate
  const manifest = pack.manifest && typeof pack.manifest === "object"
    ? pack.manifest
    : { id, name, version: "1.0.0" };

  const nationsObj = content.nations && typeof content.nations === "object" ? content.nations : { nations: FALLBACK_NATIONS };
  const nations = Array.isArray(nationsObj.nations) ? nationsObj.nations : FALLBACK_NATIONS;

  return {
    id,
    name,
    manifest,
    content: {
      ...content,
      clubs,
      players,
      nations: { nations },
    },
  };
}

function makeSavesRepo() {
  const META_KEY = "VFM_SAVES_META_V1";
  const SLOT_PREFIX = "VFM_SAVE_SLOT_"; // + "1" | "2"

  function nowISO() {
    try { return new Date().toISOString(); } catch { return ""; }
  }

  function readMeta() {
    try {
      const raw = localStorage.getItem(META_KEY);
      if (!raw) return { slots: { "1": { exists: false }, "2": { exists: false } } };
      const obj = JSON.parse(raw);
      if (!obj?.slots) return { slots: { "1": { exists: false }, "2": { exists: false } } };
      return obj;
    } catch {
      return { slots: { "1": { exists: false }, "2": { exists: false } } };
    }
  }

  function writeMeta(meta) {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch {}
  }

  function readSlot(id) {
    const sid = String(id);
    const meta = readMeta();
    try {
      const raw = localStorage.getItem(SLOT_PREFIX + sid);
      if (!raw) return { exists: false, updatedAt: null, data: null };
      const data = JSON.parse(raw);
      const updatedAt = meta?.slots?.[sid]?.updatedAt ?? null;
      return { exists: true, updatedAt, data };
    } catch {
      return { exists: false, updatedAt: null, data: null };
    }
  }

  function writeSlot(id, data) {
    const sid = String(id);
    const meta = readMeta();
    const updatedAt = nowISO();
    try {
      localStorage.setItem(SLOT_PREFIX + sid, JSON.stringify(data));
      meta.slots[sid] = { exists: true, updatedAt };
      writeMeta(meta);
      return { ok: true, updatedAt };
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    }
  }

  function clearSlot(id) {
    const sid = String(id);
    const meta = readMeta();
    try {
      localStorage.removeItem(SLOT_PREFIX + sid);
      meta.slots[sid] = { exists: false, updatedAt: null };
      writeMeta(meta);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    }
  }

  function readAll() {
    const meta = readMeta();
    const slots = meta.slots || {};
    // garante os dois slots sempre
    for (const sid of ["1", "2"]) {
      if (!slots[sid]) slots[sid] = { exists: false, updatedAt: null };
      if (typeof slots[sid].exists !== "boolean") slots[sid].exists = false;
      if (!("updatedAt" in slots[sid])) slots[sid].updatedAt = null;
    }
    return { slots };
  }

  return { readAll, readSlot, writeSlot, clearSlot };
}

export function createRepositories({ logger } = {}) {
  const log = logger ?? console;
  const saves = makeSavesRepo();

  let packsCache = null;

  async function listPacks() {
    if (packsCache) return packsCache;
    const raw = await safeFetchJson("./packs/index.json", FALLBACK_PACKS_INDEX);
    const packs = normalizeArray(raw);
    packsCache = packs.map((p) => ({
      id: p.id,
      title: p.title ?? p.name ?? p.id,
      description: p.description ?? "",
    }));
    return packsCache;
  }

  async function loadPack(packId) {
    const id = packId || FALLBACK_PACK.id;
    const raw = await safeFetchJson(`./packs/${id}/pack.json`, FALLBACK_PACK);
    const shaped = ensurePackShape(raw, id);
    if (!Array.isArray(shaped.content.clubs)) {
      log.warn?.("Pack inválido (clubs), usando fallback", { id, shaped });
      return ensurePackShape(FALLBACK_PACK, id);
    }
    return shaped;
  }

  async function loadPlayers(packId) {
    const id = packId || FALLBACK_PACK.id;
    const raw = await safeFetchJson(`./packs/${id}/players.json`, []);
    return normalizeArray(raw);
  }

  function logoSrc(clubId) {
    return `assets/logos/${clubId}.png`;
  }

  function faceSrc(playerId) {
    return `assets/faces/${playerId}.png`;
  }

  return {
    saves,
    dataPacks: FALLBACK_PACKS_INDEX,
    listPacks,
    loadPack,
    loadPlayers,
    logoSrc,
    faceSrc,
  };
}