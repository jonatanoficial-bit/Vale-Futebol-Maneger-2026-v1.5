(function () {
  window.VFM26 = window.VFM26 || {};
  const NS = window.VFM26;

  const STORAGE = {
    PACK_ID: 'vfm26.packId',
    PACK_DATA: 'vfm26.packData',
    SAVE_SLOT: 'vfm26.saveSlot',
    CAREER: 'vfm26.careerData',
  };

  function nowISO() {
    return new Date().toISOString();
  }

  function safeJSONParse(str, fallback) {
    try { return JSON.parse(str); } catch { return fallback; }
  }

  function isObject(x) {
    return x && typeof x === 'object' && !Array.isArray(x);
  }

  function deepClone(x) {
    return JSON.parse(JSON.stringify(x));
  }

  const DEFAULT_SLOT_STATE = {
    id: null,
    name: null,
    createdAt: null,
    updatedAt: null,
    packId: null,
    careerData: null
  };

  const Game = {
    state: {
      packId: null,
      packData: null,
      saveSlotId: null,
      careerData: null,
    },

    init() {
      // pack
      const packId = localStorage.getItem(STORAGE.PACK_ID);
      const packDataRaw = localStorage.getItem(STORAGE.PACK_DATA);
      this.state.packId = packId || null;
      this.state.packData = packDataRaw ? safeJSONParse(packDataRaw, null) : null;

      // slot
      const slotId = localStorage.getItem(STORAGE.SAVE_SLOT);
      this.state.saveSlotId = slotId || null;

      // career (do slot atual, se existir)
      this.loadCareerFromSlot();
    },

    // =========================
    // Packs
    // =========================

    async loadPackCatalog() {
      // Busca packs/catalog.json (para GitHub Pages / Vercel)
      const url = 'packs/catalog.json';
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Catalog not found: ${url}`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },

    async loadPackById(id) {
      const catalog = await this.loadPackCatalog();
      const entry = catalog.find(p => String(p.id) === String(id));
      if (!entry) throw new Error(`Pack ${id} não encontrado no catálogo.`);

      const url = entry.path;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Pack file not found: ${url}`);
      const pack = await res.json();

      this.state.packId = String(entry.id);
      this.state.packData = pack;

      localStorage.setItem(STORAGE.PACK_ID, this.state.packId);
      localStorage.setItem(STORAGE.PACK_DATA, JSON.stringify(pack));

      return pack;
    },

    clearPack() {
      this.state.packId = null;
      this.state.packData = null;
      localStorage.removeItem(STORAGE.PACK_ID);
      localStorage.removeItem(STORAGE.PACK_DATA);
    },

    // =========================
    // Save Slots
    // =========================

    slotKey(slotId) {
      return `vfm26.slot.${slotId}`;
    },

    listSlots() {
      const out = [];
      for (let i = 1; i <= 2; i++) {
        const raw = localStorage.getItem(this.slotKey(i));
        if (!raw) {
          out.push({ ...deepClone(DEFAULT_SLOT_STATE), id: String(i) });
          continue;
        }
        const obj = safeJSONParse(raw, null);
        if (!obj || !isObject(obj)) {
          out.push({ ...deepClone(DEFAULT_SLOT_STATE), id: String(i) });
          continue;
        }
        out.push({
          ...deepClone(DEFAULT_SLOT_STATE),
          ...obj,
          id: String(i),
        });
      }
      return out;
    },

    selectSlot(slotId) {
      this.state.saveSlotId = String(slotId);
      localStorage.setItem(STORAGE.SAVE_SLOT, this.state.saveSlotId);
      this.loadCareerFromSlot();
    },

    clearSlot(slotId) {
      localStorage.removeItem(this.slotKey(slotId));
      if (String(slotId) === String(this.state.saveSlotId)) {
        this.state.careerData = null;
        localStorage.removeItem(STORAGE.CAREER);
      }
    },

    saveSlotState(slotId, slotState) {
      const normalized = {
        ...deepClone(DEFAULT_SLOT_STATE),
        ...slotState,
        id: String(slotId),
        updatedAt: nowISO(),
      };
      localStorage.setItem(this.slotKey(slotId), JSON.stringify(normalized));
      return normalized;
    },

    getCurrentSlotState() {
      const id = this.state.saveSlotId;
      if (!id) return null;
      const raw = localStorage.getItem(this.slotKey(id));
      return raw ? safeJSONParse(raw, null) : null;
    },

    // =========================
    // Career
    // =========================

    loadCareerFromSlot() {
      const slot = this.getCurrentSlotState();
      if (!slot || !slot.careerData) {
        this.state.careerData = null;
        localStorage.removeItem(STORAGE.CAREER);
        return null;
      }
      this.state.careerData = slot.careerData;
      localStorage.setItem(STORAGE.CAREER, JSON.stringify(slot.careerData));
      return slot.careerData;
    },

    getCareer() {
      return this.state.careerData;
    },

    createCareer(payload) {
      if (!this.state.saveSlotId) throw new Error('Selecione um slot antes de criar carreira.');
      if (!this.state.packId || !this.state.packData) throw new Error('Selecione um DataPack antes de criar carreira.');

      const career = {
        id: `career_${Date.now()}`,
        createdAt: nowISO(),
        updatedAt: nowISO(),
        packId: this.state.packId,
        managerName: String(payload.managerName || 'Jogador'),
        country: String(payload.country || 'BR'),
        role: String(payload.role || 'coach'),
        clubId: String(payload.clubId || ''),
        world: null, // Fase 4
      };

      this.state.careerData = career;
      localStorage.setItem(STORAGE.CAREER, JSON.stringify(career));

      // grava no slot
      const slotState = this.getCurrentSlotState() || { ...deepClone(DEFAULT_SLOT_STATE), id: String(this.state.saveSlotId) };
      slotState.name = slotState.name || `Slot ${this.state.saveSlotId}`;
      slotState.createdAt = slotState.createdAt || nowISO();
      slotState.packId = this.state.packId;
      slotState.careerData = career;
      this.saveSlotState(this.state.saveSlotId, slotState);

      // garante mundo (fase 4) já no início
      this.ensureWorld();
      this.saveCareer();

      return career;
    },

    saveCareer() {
      if (!this.state.saveSlotId) return;
      const career = this.state.careerData;
      if (!career) return;

      career.updatedAt = nowISO();
      localStorage.setItem(STORAGE.CAREER, JSON.stringify(career));

      const slotState = this.getCurrentSlotState() || { ...deepClone(DEFAULT_SLOT_STATE), id: String(this.state.saveSlotId) };
      slotState.packId = this.state.packId;
      slotState.careerData = career;
      if (!slotState.createdAt) slotState.createdAt = nowISO();
      this.saveSlotState(this.state.saveSlotId, slotState);
    },

    // =========================
    // Clubs (com escudos)
    // =========================

    getClubsFromPack() {
      const pack = this.state.packData;
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
          crest: c.crest ? String(c.crest) : `assets/crests/${String(c.id)}.png`
        }));
    },
  };

  // ===== FASE 4 (Calendário) – World/Season via assignments =====

  Game.ensureWorld = function ensureWorld() {
    const career = this.getCareer();
    const pack = this.state.packData;
    if (!career || !pack) return null;

    // já existe
    if (career.world && typeof career.world === 'object') {
      // garante calendar
      career.world.calendar = career.world.calendar || null;
      if (!career.world.calendar) {
        career.world.calendar = NS.Engine?.Calendar?.buildSeason(pack, { startISO: '2026-01-01' }) || null;
      }
      return career.world;
    }

    const baseWorld = (NS.Engine && NS.Engine.GameCore && NS.Engine.GameCore.createBaseWorld)
      ? NS.Engine.GameCore.createBaseWorld(pack)
      : { createdAt: nowISO() };

    baseWorld.calendar = (NS.Engine && NS.Engine.Calendar && NS.Engine.Calendar.buildSeason)
      ? NS.Engine.Calendar.buildSeason(pack, { startISO: '2026-01-01' })
      : { startISO: '2026-01-01', dayIndex: 0, fixtures: [] };

    baseWorld.lastMatch = null;

    career.world = baseWorld;
    this.saveCareer();
    return career.world;
  };

  Game.getToday = function getToday() {
    const career = this.getCareer();
    if (!career) return { dateISO: '2026-01-01', dayIndex: 0 };
    this.ensureWorld();
    const cal = career.world?.calendar;
    const startISO = cal?.startISO || '2026-01-01';
    const dayIndex = Number.isFinite(cal?.dayIndex) ? cal.dayIndex : 0;

    const d = new Date(startISO + 'T00:00:00');
    d.setDate(d.getDate() + dayIndex);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return { dateISO: `${y}-${m}-${dd}`, dayIndex };
  };

  Game.advanceDay = function advanceDay(n) {
    const career = this.getCareer();
    if (!career) return;
    this.ensureWorld();
    const cal = career.world.calendar;
    const add = Number.isFinite(n) ? n : 1;
    cal.dayIndex = (Number.isFinite(cal.dayIndex) ? cal.dayIndex : 0) + add;
    this.saveCareer();
  };

  Game.getFixturesForDate = function getFixturesForDate(dateISO) {
    const career = this.getCareer();
    if (!career) return [];
    this.ensureWorld();
    const fixtures = Array.isArray(career.world?.calendar?.fixtures) ? career.world.calendar.fixtures : [];
    return fixtures.filter(f => String(f.dateISO) === String(dateISO));
  };

  Game.getNextMatchday = function getNextMatchday(clubId) {
    const career = this.getCareer();
    if (!career) return null;
    this.ensureWorld();

    const cal = career.world?.calendar;
    if (!cal) return null;

    const todayISO = this.getToday().dateISO;
    const fixtures = Array.isArray(cal.fixtures) ? cal.fixtures : [];
    const cid = String(clubId);

    // próximo jogo do clube após hoje (inclusive hoje)
    const sorted = fixtures.slice().sort((a, b) => String(a.dateISO).localeCompare(String(b.dateISO)));
    for (const f of sorted) {
      if (String(f.dateISO) < String(todayISO)) continue;
      if (String(f.home) === cid || String(f.away) === cid) return f;
    }
    return null;
  };

  Game.simulateNextMatch = function simulateNextMatch() {
    const career = this.getCareer();
    if (!career) return false;
    this.ensureWorld();

    const cid = String(career.clubId);
    const next = this.getNextMatchday(cid);
    if (!next) return false;

    const clubs = this.getClubsFromPack();
    const byId = {};
    clubs.forEach(c => byId[c.id] = c);

    const homeRating = byId[next.home]?.rating ?? 70;
    const awayRating = byId[next.away]?.rating ?? 70;

    const rng = Math.random;
    const res = NS.Engine?.Match?.simulate
      ? NS.Engine.Match.simulate({
          home: next.home,
          away: next.away,
          homeRating,
          awayRating,
          rng
        })
      : { home: next.home, away: next.away, homeGoals: 1, awayGoals: 1, draw: true, winner: null };

    career.world.lastMatch = {
      ...next,
      homeGoals: res.homeGoals,
      awayGoals: res.awayGoals,
      winner: res.winner,
      draw: res.draw
    };

    // avança o dia para o dia da partida (se ainda não chegou) + 1 dia
    const today = this.getToday().dateISO;
    if (String(next.dateISO) > String(today)) {
      // calcula diferença em dias
      const d1 = new Date(today + 'T00:00:00');
      const d2 = new Date(String(next.dateISO) + 'T00:00:00');
      const diffDays = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) this.advanceDay(diffDays);
    }
    this.advanceDay(1);

    this.saveCareer();
    return true;
  };

  NS.Game = Game;
})();