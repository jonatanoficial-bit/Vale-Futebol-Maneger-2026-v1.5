/*

  Vale Futebol Manager 2026 - Game Bridge (Phase 3 ready)

  - Provides the single API consumed by UI (ui/ui.js, ui/career-ui.js, ui/lobby-ui.js)
  - Keeps everything data-pack driven (JSON in /packs)
  - Saves are stored in localStorage per slot

  IMPORTANT (Diretriz do projeto):
  - Não inventar caminhos: os escudos reais estão em /assets/logos.
  - Packs podem crescer para “mundo” só adicionando JSON e registrando no /packs/catalog.json

*/

(function () {
  'use strict';

  // ------------------------------------------------------------
  // Namespace
  // ------------------------------------------------------------
  window.VFM26 = window.VFM26 || {};
  const NS = window.VFM26;

  // ------------------------------------------------------------
  // Constants / Keys
  // ------------------------------------------------------------
  const LS = {
    PACK_ID: 'VFM26.packId',
    PACK_CACHE: 'VFM26.packCache', // { [packId]: packJson }
    SLOT_SELECTED: 'VFM26.slotSelected',
    SLOT_PREFIX: 'VFM26.slot.', // +1 or +2
  };

  const DEFAULTS = {
    packId: 'brasil',
    catalogUrl: 'packs/catalog.json',
    fallbackPackUrl: 'packs/brasil_pack.json',
  };

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------
  function nowIso() {
    return new Date().toISOString();
  }

  function safeJsonParse(str, fallback) {
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  }

  function lsGet(key, fallback = null) {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  }

  function lsSet(key, value) {
    localStorage.setItem(key, value);
  }

  function lsDel(key) {
    localStorage.removeItem(key);
  }

  function lsGetJson(key, fallback = null) {
    return safeJsonParse(lsGet(key, null), fallback);
  }

  function lsSetJson(key, obj) {
    lsSet(key, JSON.stringify(obj));
  }

  function normalizeText(v) {
    return (v === undefined || v === null) ? '' : String(v);
  }

  function normalizeId(v) {
    return normalizeText(v).trim();
  }

  function fetchJson(url) {
    // Cache bust only for development; keep stable in prod.
    const u = url.includes('?') ? `${url}&_=${Date.now()}` : `${url}?_=${Date.now()}`;
    return fetch(u, { cache: 'no-store' }).then(async (r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status} loading ${url}`);
      return r.json();
    });
  }

  function clamp(n, a, b) {
    const x = Number(n);
    if (Number.isNaN(x)) return a;
    return Math.max(a, Math.min(b, x));
  }

  function getSlotKey(slot) {
    const s = Number(slot);
    if (s !== 1 && s !== 2) throw new Error('Slot inválido');
    return `${LS.SLOT_PREFIX}${s}`;
  }

  function defaultSlotState() {
    return {
      createdAt: null,
      updatedAt: null,
      packId: null,
      career: null, // { firstName,lastName,country,avatarId,roleId,clubId,clubName,clubCrest }
      tutorialShown: false,
      world: null, // future: season, fixtures, standings, etc.
    };
  }

  function readSlot(slot) {
    const key = getSlotKey(slot);
    const obj = lsGetJson(key, null);
    if (!obj) return { empty: true, slot: Number(slot), data: defaultSlotState() };
    return { empty: false, slot: Number(slot), data: obj };
  }

  function writeSlot(slot, data) {
    const key = getSlotKey(slot);
    const stamp = nowIso();
    const next = { ...defaultSlotState(), ...data };
    next.updatedAt = stamp;
    if (!next.createdAt) next.createdAt = stamp;
    lsSetJson(key, next);
    return next;
  }

  function deleteSlot(slot) {
    lsDel(getSlotKey(slot));
  }

  function getSelectedSlot() {
    const v = Number(lsGet(LS.SLOT_SELECTED, '0'));
    return (v === 1 || v === 2) ? v : null;
  }

  function setSelectedSlot(slot) {
    const s = Number(slot);
    if (s !== 1 && s !== 2) throw new Error('Slot inválido');
    lsSet(LS.SLOT_SELECTED, String(s));
    return s;
  }

  function getActivePackId() {
    return lsGet(LS.PACK_ID, DEFAULTS.packId);
  }

  function setActivePackId(packId) {
    const id = normalizeId(packId) || DEFAULTS.packId;
    lsSet(LS.PACK_ID, id);
    return id;
  }

  function getPackCache() {
    return lsGetJson(LS.PACK_CACHE, {}) || {};
  }

  function setPackCache(cache) {
    lsSetJson(LS.PACK_CACHE, cache || {});
  }

  // ------------------------------------------------------------
  // Catalog & Pack loading
  // ------------------------------------------------------------
  async function listPacks() {
    // Primary source: /packs/catalog.json
    // Fallback: one-pack catalog (brasil)
    try {
      const catalog = await fetchJson(DEFAULTS.catalogUrl);
      const packs = Array.isArray(catalog?.packs) ? catalog.packs : [];
      return packs
        .filter(p => p && p.id && p.name && p.file)
        .map(p => ({
          id: normalizeId(p.id),
          name: normalizeText(p.name),
          region: normalizeText(p.region),
          file: normalizeText(p.file),
          description: normalizeText(p.description),
        }));
    } catch (e) {
      return [
        {
          id: 'brasil',
          name: 'Brasil (Série A, Série B, Copa do Brasil, Estaduais)',
          region: 'SA',
          file: DEFAULTS.fallbackPackUrl,
          description: 'Fallback local (catalog.json ausente).',
        },
      ];
    }
  }

  async function loadPack(packId) {
    const id = normalizeId(packId) || getActivePackId();
    const cache = getPackCache();

    if (cache[id]) {
      return cache[id];
    }

    const packs = await listPacks();
    const found = packs.find(p => p.id === id);
    const url = found?.file || DEFAULTS.fallbackPackUrl;

    const pack = await fetchJson(url);

    cache[id] = pack;
    setPackCache(cache);

    return pack;
  }

  function getPackSummary(pack) {
    if (!pack) return null;
    const clubs = Array.isArray(pack.clubs) ? pack.clubs : [];
    const leagues = Array.isArray(pack.leagues) ? pack.leagues : [];
    const cups = Array.isArray(pack.cups) ? pack.cups : [];
    return {
      id: normalizeId(pack.id),
      name: normalizeText(pack.name),
      region: normalizeText(pack.region),
      version: normalizeText(pack.version),
      description: normalizeText(pack.description),
      clubsCount: clubs.length,
      leaguesCount: leagues.length,
      cupsCount: cups.length,
      calendar: pack.calendar || null,
    };
  }

  // ------------------------------------------------------------
  // Career Data (Phase 3)
  // ------------------------------------------------------------
  function getCountriesForCareer(packId) {
    // For Phase 3: pack-driven + base options.
    // In future global expansion: countries can come from pack.countries.
    const id = normalizeId(packId) || getActivePackId();
    if (id === 'brasil') {
      return [
        { id: 'BR', name: 'Brasil' },
        { id: 'AR', name: 'Argentina' },
        { id: 'UY', name: 'Uruguai' },
        { id: 'CL', name: 'Chile' },
        { id: 'PT', name: 'Portugal' },
        { id: 'ES', name: 'Espanha' },
        { id: 'IT', name: 'Itália' },
        { id: 'DE', name: 'Alemanha' },
        { id: 'FR', name: 'França' },
        { id: 'GB', name: 'Inglaterra' },
      ];
    }
    return [
      { id: 'BR', name: 'Brasil' },
      { id: 'GB', name: 'Inglaterra' },
      { id: 'ES', name: 'Espanha' },
      { id: 'IT', name: 'Itália' },
    ];
  }

  function getAvatars() {
    // Simple list. You can replace by assets/avatars later.
    return [
      { id: 'A1', name: 'Avatar 1' },
      { id: 'A2', name: 'Avatar 2' },
      { id: 'A3', name: 'Avatar 3' },
      { id: 'A4', name: 'Avatar 4' },
    ];
  }

  function getRoles() {
    return [
      {
        id: 'coach',
        name: 'Treinador',
        description: 'Escalação, treinos, tática, jogos, notícias e gestão de elenco.',
      },
      {
        id: 'sportingDirector',
        name: 'Diretor Esportivo',
        description: 'Foco em contratações/vendas, comissão técnica e negociações.',
      },
      {
        id: 'president',
        name: 'Presidente',
        description: 'Gestão total: finanças, estádio/CT, diretrizes e decisões macro.',
      },
    ];
  }

  function getClubsFromPack(pack) {
    if (!pack) return [];
    const clubs = Array.isArray(pack.clubs) ? pack.clubs : [];

    return clubs
      .filter(c => c && c.id && c.name)
      .map(c => {
        const id = normalizeId(c.id);
        // Diretriz: escudos reais já estão em assets/logos
        const crest =
          c.crest
            ? normalizeText(c.crest)
            : `assets/logos/${id}.png`;

        return {
          id,
          name: normalizeText(c.name),
          shortName: c.shortName ? normalizeText(c.shortName) : normalizeText(c.name),
          league: c.league ? normalizeText(c.league) : 'unknown',
          state: c.state ? normalizeText(c.state) : '',
          rating: typeof c.rating === 'number' ? c.rating : null,
          budget: typeof c.budget === 'number' ? c.budget : null,
          crest,
        };
      });
  }

  function createCareerDraft(input, pack) {
    const firstName = normalizeText(input?.firstName).trim();
    const lastName = normalizeText(input?.lastName).trim();
    const country = normalizeId(input?.country).trim();
    const avatarId = normalizeId(input?.avatarId).trim();
    const roleId = normalizeId(input?.roleId).trim();
    const clubId = normalizeId(input?.clubId).trim();

    const roles = getRoles();
    const roleOk = roles.some(r => r.id === roleId);

    const clubs = getClubsFromPack(pack);
    const club = clubs.find(c => c.id === clubId) || null;

    const errors = [];

    if (!firstName) errors.push('Primeiro nome é obrigatório.');
    if (!lastName) errors.push('Sobrenome é obrigatório.');
    if (!country) errors.push('País é obrigatório.');
    if (!avatarId) errors.push('Avatar é obrigatório.');
    if (!roleOk) errors.push('Cargo inválido.');
    if (!club) errors.push('Clube inválido.');

    return {
      ok: errors.length === 0,
      errors,
      draft: {
        firstName,
        lastName,
        country,
        avatarId,
        roleId,
        clubId: club?.id || '',
        clubName: club?.name || '',
        clubCrest: club?.crest || '',
      },
    };
  }

  async function commitCareerToSlot(slot, careerDraft, packId) {
    const s = Number(slot);
    if (s !== 1 && s !== 2) throw new Error('Slot inválido');

    const id = normalizeId(packId) || getActivePackId();
    const pack = await loadPack(id);

    const validation = createCareerDraft(careerDraft, pack);
    if (!validation.ok) {
      return { ok: false, errors: validation.errors };
    }

    const current = readSlot(s);
    const nextData = {
      ...current.data,
      packId: id,
      career: validation.draft,
      tutorialShown: false,
      world: current.data?.world || null,
    };

    writeSlot(s, nextData);

    // Make this slot the selected slot (convenience)
    setSelectedSlot(s);

    return { ok: true };
  }

  function markTutorialShown(slot) {
    const s = Number(slot);
    const cur = readSlot(s);
    const next = {
      ...cur.data,
      tutorialShown: true,
    };
    writeSlot(s, next);
    return true;
  }

  function shouldShowTutorial(slot) {
    const s = Number(slot);
    const cur = readSlot(s);
    // If slot empty, tutorial not relevant yet
    if (cur.empty) return false;
    return !Boolean(cur.data?.tutorialShown);
  }

  // ------------------------------------------------------------
  // Public API (used by UI)
  // ------------------------------------------------------------
  const Game = {
    // Packs
    listPacks,
    loadPack,
    getPackSummary,

    // Active pack
    getActivePackId,
    setActivePackId,

    // Slots
    readSlot,
    deleteSlot,
    selectSlot: setSelectedSlot,
    getSelectedSlot,

    // Career (Phase 3)
    getCountriesForCareer,
    getAvatars,
    getRoles,
    getClubsFromPack,
    createCareerDraft,
    commitCareerToSlot,
    markTutorialShown,
    shouldShowTutorial,
  };

  // ------------------------------------------------------------
  // Register Bridge
  // ------------------------------------------------------------
  NS.Game = Game;

  // Optional: debugging marker for BOOT_STEPS
  NS.__BOOT = NS.__BOOT || {};
  NS.__BOOT.gameRegisteredAt = nowIso();
})();