/* Vale Futebol Manager 2026 - Game Bridge (Fase 3)
 * Responsável por: carregar DataPacks, gerenciar Save Slots, criar Carreira,
 * e expor funções usadas pela UI (ui/*.js).
 *
 * IMPORTANTE:
 * - Este arquivo deve existir e registrar window.VFM26.Game, senão a inicialização falha.
 * - Não depende de frameworks.
 */
(function () {
  'use strict';

  const NS = (window.VFM26 = window.VFM26 || {});
  const STORAGE_KEY = 'VFM26_SAVES_V1';

  // -----------------------------
  // Utils
  // -----------------------------
  function nowIso() {
    return new Date().toISOString();
  }

  function safeJsonParse(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
  }

  async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status} ao carregar ${url}`);
    return await res.json();
  }

  function addDays(isoDate, days) {
    const d = new Date(isoDate + 'T00:00:00');
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function clampStr(v, fallback) {
    if (typeof v === 'string' && v.trim()) return v.trim();
    return fallback;
  }

  // -----------------------------
  // Save Slots (2 slots)
  // -----------------------------
  function loadSaveSlots() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = safeJsonParse(raw, null);

    // Estrutura padrão: 2 slots
    const base = {
      version: 1,
      slots: {
        1: { id: 1, exists: false, packId: null, updatedAt: null, data: null },
        2: { id: 2, exists: false, packId: null, updatedAt: null, data: null }
      }
    };

    if (!parsed || typeof parsed !== 'object' || !parsed.slots) return base;

    // merge defensivo
    const out = base;
    for (const k of ['1', '2']) {
      const s = parsed.slots && parsed.slots[k];
      if (s && typeof s === 'object') {
        out.slots[k] = {
          id: Number(k),
          exists: !!s.exists,
          packId: s.packId ?? null,
          updatedAt: s.updatedAt ?? null,
          data: s.data ?? null
        };
      }
    }
    return out;
  }

  function saveSaveSlots(model) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
  }

  // -----------------------------
  // Game State
  // -----------------------------
  const state = {
    version: '1.2.0',

    // pack
    packId: null,
    packData: null,

    // save
    saveSlot: null, // 1|2

    // career
    career: null, // { manager, role, club, createdAt }

    // calendar/world
    world: null, // { today, seasonStart, seasonEnd, dayIndex }
    tutorialShown: false
  };

  // -----------------------------
  // Packs
  // -----------------------------
  async function listPacks() {
    // Se existir um catálogo no futuro, ele será usado automaticamente.
    // Caso não exista, retornamos fallback (Brasil).
    try {
      const catalog = await fetchJson('packs/catalog.json');
      if (Array.isArray(catalog)) return catalog;
      if (catalog && Array.isArray(catalog.packs)) return catalog.packs;
    } catch (e) {
      // ignore e usa fallback
    }

    return [
      {
        id: 'brasil',
        name: 'Brasil (Série A, Série B, Copa do Brasil, Estaduais)',
        region: 'SA',
        file: 'packs/brasil_pack.json',
        description: 'Pack inicial do Brasil. Pronto para expansão global adicionando novos packs em /packs.'
      }
    ];
  }

  async function loadPack(packId) {
    const id = String(packId || '').trim();
    if (!id) throw new Error('packId inválido');

    const packs = await listPacks();
    const packMeta = packs.find(p => String(p.id) === id);

    const file = packMeta && packMeta.file ? String(packMeta.file) : `packs/${id}_pack.json`;
    const pack = await fetchJson(file);

    state.packId = id;
    state.packData = pack;

    // Ajusta world se já existe carreira (ou se UI abrir calendário)
    ensureWorld();

    return pack;
  }

  function getPackSummary() {
    const p = state.packData;
    if (!p) return null;
    return {
      id: p.id ?? state.packId,
      name: p.name ?? state.packId,
      region: p.region ?? '',
      version: p.version ?? '',
      description: p.description ?? ''
    };
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
        rating: typeof c.rating === 'number' ? c.rating : null,
        budget: typeof c.budget === 'number' ? c.budget : null,
        crest: c.crest ? String(c.crest) : `assets/crests/${String(c.id)}.png` // fallback padrão
      }));
  }

  function getClubById(clubId) {
    const id = String(clubId || '');
    return getClubsFromPack().find(c => c.id === id) || null;
  }

  // -----------------------------
  // World / Calendar
  // -----------------------------
  function ensureWorld() {
    if (state.world) return state.world;

    const pack = state.packData;
    const cal = pack && pack.calendar ? pack.calendar : null;
    const seasonStart = (cal && cal.seasonStart) ? String(cal.seasonStart) : '2026-01-01';
    const seasonEnd   = (cal && cal.seasonEnd) ? String(cal.seasonEnd) : '2026-12-31';

    state.world = {
      seasonStart,
      seasonEnd,
      dayIndex: 0,
      today: seasonStart
    };

    return state.world;
  }

  function getToday() {
    return ensureWorld().today;
  }

  function getNextMatchday() {
    // Fase 4 vai substituir isso por calendário real/rodadas.
    // Por enquanto, consideramos próximo "matchday" como +7 dias.
    const w = ensureWorld();
    return addDays(w.today, 7);
  }

  function advanceDay(days) {
    const w = ensureWorld();
    const n = (typeof days === 'number' && isFinite(days)) ? Math.max(1, Math.floor(days)) : 1;
    w.dayIndex += n;
    w.today = addDays(w.today, n);

    // persiste no save se existir
    persistToCurrentSlot();
    return w.today;
  }

  // -----------------------------
  // Career
  // -----------------------------
  function getCountriesForCareer() {
    // Pode virar data-driven (via pack) no futuro.
    return [
      { id: 'BR', name: 'Brasil' },
      { id: 'AR', name: 'Argentina' },
      { id: 'UY', name: 'Uruguai' },
      { id: 'CO', name: 'Colômbia' },
      { id: 'PT', name: 'Portugal' }
    ];
  }

  function getAvatars() {
    // IDs que batem com assets/avatars/*.png (ou o que você já tiver).
    // Pode trocar/expandir sem quebrar saves.
    return [
      { id: 'a1', name: 'Avatar 1', file: 'assets/avatars/a1.png' },
      { id: 'a2', name: 'Avatar 2', file: 'assets/avatars/a2.png' },
      { id: 'a3', name: 'Avatar 3', file: 'assets/avatars/a3.png' },
      { id: 'a4', name: 'Avatar 4', file: 'assets/avatars/a4.png' }
    ];
  }

  function getRoles() {
    return [
      { id: 'coach', name: 'Treinador' },
      { id: 'sporting', name: 'Diretor Esportivo' },
      { id: 'president', name: 'Presidente' }
    ];
  }

  function createCareer(payload) {
    const p = payload || {};
    const managerName = clampStr(p.name, 'Seu Nome');
    const country = clampStr(p.country, 'BR');
    const avatar = clampStr(p.avatar, 'a1');
    const role = clampStr(p.role, 'coach');
    const clubId = clampStr(p.clubId, '');

    const club = getClubById(clubId) || (getClubsFromPack()[0] || null);
    if (!club) throw new Error('Nenhum clube disponível no pack selecionado.');

    state.career = {
      createdAt: nowIso(),
      manager: { name: managerName, country, avatar },
      role,
      club
    };

    // Garante world
    ensureWorld();

    // Marca tutorial como não visto (vai ser mostrado após criação)
    state.tutorialShown = false;

    // persiste no slot atual
    persistToCurrentSlot();

    return state.career;
  }

  function markTutorialShown() {
    state.tutorialShown = true;
    persistToCurrentSlot();
  }

  // -----------------------------
  // Save Slot API (UI)
  // -----------------------------
  function getSlots() {
    const model = loadSaveSlots();
    return [model.slots['1'], model.slots['2']];
  }

  function deleteSlot(slotId) {
    const sid = Number(slotId);
    if (sid !== 1 && sid !== 2) return;

    const model = loadSaveSlots();
    model.slots[String(sid)] = { id: sid, exists: false, packId: null, updatedAt: null, data: null };
    saveSaveSlots(model);

    if (state.saveSlot === sid) {
      state.saveSlot = null;
      state.career = null;
      state.world = null;
      state.tutorialShown = false;
    }
  }

  function selectSlot(slotId) {
    const sid = Number(slotId);
    if (sid !== 1 && sid !== 2) throw new Error('Slot inválido');
    state.saveSlot = sid;

    // carrega data se existir
    const model = loadSaveSlots();
    const slot = model.slots[String(sid)];
    if (slot && slot.exists && slot.data) {
      hydrateFromSave(slot.data);
    }
    return sid;
  }

  function createNew(slotId) {
    const sid = Number(slotId);
    if (sid !== 1 && sid !== 2) throw new Error('Slot inválido');

    state.saveSlot = sid;
    state.career = null;
    state.world = null;
    state.tutorialShown = false;

    const model = loadSaveSlots();
    model.slots[String(sid)] = {
      id: sid,
      exists: true,
      packId: state.packId,
      updatedAt: nowIso(),
      data: snapshotForSave()
    };
    saveSaveSlots(model);
  }

  function snapshotForSave() {
    return {
      version: 1,
      packId: state.packId,
      career: state.career,
      world: state.world,
      tutorialShown: state.tutorialShown
    };
  }

  function hydrateFromSave(data) {
    if (!data || typeof data !== 'object') return;

    state.packId = data.packId ?? state.packId;
    state.career = data.career ?? null;
    state.world = data.world ?? null;
    state.tutorialShown = !!data.tutorialShown;
  }

  function persistToCurrentSlot() {
    if (state.saveSlot !== 1 && state.saveSlot !== 2) return;
    const model = loadSaveSlots();
    const sid = String(state.saveSlot);

    // Se o slot ainda não existe, cria.
    model.slots[sid] = {
      id: Number(sid),
      exists: true,
      packId: state.packId,
      updatedAt: nowIso(),
      data: snapshotForSave()
    };
    saveSaveSlots(model);
  }

  // -----------------------------
  // Public API
  // -----------------------------
  NS.Game = {
    state,

    // packs
    listPacks,
    loadPack,
    getPackSummary,
    getClubsFromPack,
    getClubById,

    // slots
    getSlots,
    selectSlot,
    createNew,
    deleteSlot,

    // career
    createCareer,
    getCountriesForCareer,
    getAvatars,
    getRoles,
    markTutorialShown,

    // calendar/world
    ensureWorld,
    getToday,
    getNextMatchday,
    advanceDay
  };
})();