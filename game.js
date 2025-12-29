// game.js — Game Bridge + State
(function () {
  const NS = (window.VFM26 = window.VFM26 || {});
  const STORAGE_KEY = 'vfm26_saves_v1';

  function nowISO() {
    try { return new Date().toISOString(); } catch { return String(Date.now()); }
  }

  function safeParseJSON(s, fallback) {
    try { return JSON.parse(s); } catch { return fallback; }
  }

  function readAllSaves() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = safeParseJSON(raw, null);
    if (!parsed || typeof parsed !== 'object') return { slots: {} };
    if (!parsed.slots || typeof parsed.slots !== 'object') parsed.slots = {};
    return parsed;
  }

  function writeAllSaves(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function fetchJson(url) {
    // Resolve relative URLs correctly on GitHub Pages (subpath) and on Vercel/root.
    const abs = new URL(String(url), document.baseURI).toString();
    // Cache bust to avoid stale CDN/service-worker content during dev/deploy.
    const u = abs.includes('?') ? `${abs}&_=${Date.now()}` : `${abs}?_=${Date.now()}`;
    return fetch(u, { cache: 'no-store' }).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} loading ${url}`);
      return r.json();
    });
  }

  function clamp(n, a, b) {
    n = Number(n);
    if (!isFinite(n)) return a;
    return Math.max(a, Math.min(b, n));
  }

  function ensureStateShape(state) {
    state = state && typeof state === 'object' ? state : {};
    if (!state.meta) state.meta = {};
    if (!state.meta.createdAt) state.meta.createdAt = nowISO();
    if (!state.meta.updatedAt) state.meta.updatedAt = nowISO();

    if (!state.packId) state.packId = null;
    if (!state.packData) state.packData = null;

    if (!state.slotId) state.slotId = null;

    if (!state.career) state.career = {};
    if (!state.career.name) state.career.name = '';
    if (!state.career.country) state.career.country = 'BR';
    if (!state.career.avatar) state.career.avatar = 'default';
    if (!state.career.role) state.career.role = '';
    if (!state.career.clubId) state.career.clubId = '';

    return state;
  }

  const state = ensureStateShape({
    meta: { createdAt: nowISO(), updatedAt: nowISO() },
    packId: null,
    packData: null,
    slotId: null,
    career: { name: '', country: 'BR', avatar: 'default', role: '', clubId: '' }
  });

  async function listPacks() {
    // Prefer DataPacks.listCatalog() if available
    if (NS.DataPacks?.listCatalog) {
      const cat = await NS.DataPacks.listCatalog();
      return Array.isArray(cat?.packs) ? cat.packs : [];
    }

    // Legacy fallback: packs/catalog.json
    try {
      const catalog = await fetchJson('packs/catalog.json');
      const packs = Array.isArray(catalog?.packs) ? catalog.packs : [];
      return packs.filter(p => p && p.id && p.name && p.file).map(p => ({
        id: String(p.id),
        name: String(p.name),
        file: String(p.file),
        region: p.region ? String(p.region) : '',
        default: Boolean(p.default)
      }));
    } catch {
      return [];
    }
  }

  async function loadPackById(packId) {
    const packs = await listPacks();
    const pack = packs.find(p => String(p.id) === String(packId)) || null;
    if (!pack) throw new Error('PACK_NOT_FOUND');
    const data = NS.DataPacks?.loadPack
      ? await NS.DataPacks.loadPack(pack.file)
      : await fetchJson(pack.file);

    state.packId = String(pack.id);
    state.packData = data;
    state.meta.updatedAt = nowISO();
    return data;
  }

  function getCurrentSlot() {
    if (!state.slotId) return null;
    const all = readAllSaves();
    return all.slots[state.slotId] || null;
  }

  function selectSlot(slotId) {
    state.slotId = String(slotId);
    state.meta.updatedAt = nowISO();
  }

  function resetSlot(slotId) {
    const all = readAllSaves();
    all.slots[String(slotId)] = null;
    writeAllSaves(all);
    if (String(state.slotId) === String(slotId)) state.slotId = String(slotId);
  }

  function newSlot(slotId) {
    const all = readAllSaves();
    all.slots[String(slotId)] = {
      meta: { createdAt: nowISO(), updatedAt: nowISO() },
      packId: state.packId,
      career: { ...state.career }
    };
    writeAllSaves(all);
    selectSlot(slotId);
  }

  async function loadSlot(slotId) {
    const all = readAllSaves();
    const slot = all.slots[String(slotId)];
    selectSlot(slotId);

    if (!slot) {
      // Empty slot: keep defaults but remember chosen pack if any
      state.career = ensureStateShape(state).career;
      state.meta.updatedAt = nowISO();
      return null;
    }

    state.career = { ...(slot.career || {}) };
    ensureStateShape(state);
    state.meta.updatedAt = nowISO();

    // load pack from slot if exists
    if (slot.packId) {
      try { await loadPackById(slot.packId); } catch { /* ignore */ }
    }
    return slot;
  }

  async function saveCurrentSlot() {
    if (!state.slotId) return;
    const all = readAllSaves();
    const slotId = String(state.slotId);
    const prev = all.slots[slotId] || {};
    all.slots[slotId] = {
      meta: {
        createdAt: prev?.meta?.createdAt || nowISO(),
        updatedAt: nowISO()
      },
      packId: state.packId,
      career: { ...state.career }
    };
    writeAllSaves(all);
  }

  function setCareerPatch(patch) {
    patch = patch && typeof patch === 'object' ? patch : {};
    state.career = state.career || {};
    if (typeof patch.name === 'string') state.career.name = patch.name.slice(0, 40);
    if (typeof patch.country === 'string') state.career.country = patch.country.slice(0, 4);
    if (typeof patch.avatar === 'string') state.career.avatar = patch.avatar.slice(0, 20);
    if (typeof patch.role === 'string') state.career.role = patch.role.slice(0, 20);
    if (typeof patch.clubId === 'string') state.career.clubId = patch.clubId.slice(0, 16);
    state.meta.updatedAt = nowISO();
  }

  function getClubsFromPack() {
    const pack = state.packData;
    if (!pack) return [];
    const clubs = Array.isArray(pack.clubs) ? pack.clubs : [];
    return clubs
      .filter(c => c && c.id && c.name)
      .map(c => ({
        id: String(c.id),
        name: String(c.name),
        shortName: c.shortName ? String(c.shortName) : String(c.name),
        league: c.league ? String(c.league) : 'unknown',
        state: c.state ? String(c.state) : '',
        rating: typeof c.rating === 'number' ? clamp(c.rating, 1, 99) : null,
        budget: typeof c.budget === 'number' ? Math.max(0, c.budget) : null,
        crest: c.crest ? String(c.crest) : `assets/crests/${String(c.id)}.png` // fallback padrão
      }));
  }

  NS.Game = {
    state,
    listPacks,
    loadPackById,
    selectSlot,
    resetSlot,
    newSlot,
    loadSlot,
    saveCurrentSlot,
    setCareerPatch,
    getClubsFromPack,
    getCurrentSlot
  };
})();