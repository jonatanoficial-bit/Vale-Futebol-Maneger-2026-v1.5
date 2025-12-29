/* game.js — Interface entre Engine e UI (estado, saves, fluxo) */
(function () {
  'use strict';

  const NS = (window.VFM26 = window.VFM26 || {});
  const SAVE_PREFIX = 'vfm26_save_slot_';

  function nowISO() {
    try { return new Date().toISOString(); } catch { return '';}
  }

  function safeJSONParse(text, fallback) {
    try { return JSON.parse(text); } catch { return fallback; }
  }

  function deepClone(obj) {
    return safeJSONParse(JSON.stringify(obj), null);
  }

  const Game = {
    state: {
      version: '1.3.0',
      packId: null,
      packMeta: null,
      packData: null,
      slot: null,        // 1 or 2
      save: null,        // loaded save object
      career: null,      // career object
      flags: {
        tutorialShown: false
      }
    },

    init() {
      // Nada que dependa de DOM aqui (regra: sem quebrar boot)
      this._rehydrateLastSelection();
    },

    // --------- Pack ----------
    async listPacks() {
      return await NS.Engine.DataPacks.listCatalog();
    },

    async loadPack(packId) {
      NS.BootCheck.step('GAME_LOAD_PACK');
      if (!packId) throw new Error('packId inválido');
      const pack = await NS.Engine.DataPacks.load(packId);
      this.state.packId = packId;
      this.state.packMeta = pack.meta;
      this.state.packData = pack.data;
      this._persistLastSelection();
      return pack;
    },

    getPackSummary() {
      const meta = this.state.packMeta;
      if (!meta) return null;
      return {
        id: meta.id,
        name: meta.name,
        region: meta.region,
        description: meta.description
      };
    },

    // --------- Slots / Saves ----------
    getSlotKey(slot) {
      return `${SAVE_PREFIX}${slot}`;
    },

    readSlot(slot) {
      const key = this.getSlotKey(slot);
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const data = safeJSONParse(raw, null);
      if (!data || typeof data !== 'object') return null;
      return data;
    },

    writeSlot(slot, saveObj) {
      const key = this.getSlotKey(slot);
      try {
        localStorage.setItem(key, JSON.stringify(saveObj));
        return true;
      } catch (e) {
        NS.BootCheck.fatal('SAVE_E01_LOCALSTORAGE_WRITE', 'Falha ao salvar no armazenamento do navegador.', String(e));
        return false;
      }
    },

    deleteSlot(slot) {
      const key = this.getSlotKey(slot);
      try {
        localStorage.removeItem(key);
        return true;
      } catch (e) {
        NS.BootCheck.fatal('SAVE_E00_LOCALSTORAGE_DELETE', 'Falha ao apagar o slot.', String(e));
        return false;
      }
    },

    selectSlot(slot) {
      if (slot !== 1 && slot !== 2) throw new Error('slot inválido');
      this.state.slot = slot;
      this.state.save = this.readSlot(slot);
      this.state.career = this.state.save?.career || null;
      this._persistLastSelection();
      return this.state.save;
    },

    createNewSaveSkeleton() {
      const packId = this.state.packId;
      if (!packId) throw new Error('packId não definido');
      return {
        schema: 'vfm26.save.v1',
        createdAt: nowISO(),
        updatedAt: nowISO(),
        packId,
        career: null,
        world: null,
        meta: {
          notes: ''
        }
      };
    },

    // --------- Carreira ----------
    getCountriesForCareer() {
      // Expansão futura: pode vir do pack.
      // Hoje: lista curta e limpa, com Brasil em destaque.
      return [
        { id: 'BR', name: 'Brasil' },
        { id: 'AR', name: 'Argentina' },
        { id: 'UY', name: 'Uruguai' },
        { id: 'CL', name: 'Chile' },
        { id: 'CO', name: 'Colômbia' },
        { id: 'PT', name: 'Portugal' },
        { id: 'ES', name: 'Espanha' },
        { id: 'IT', name: 'Itália' },
        { id: 'DE', name: 'Alemanha' },
        { id: 'FR', name: 'França' },
        { id: 'GB', name: 'Inglaterra' }
      ];
    },

    getAvatars() {
      // Sem tocar em /assets. Avatares são "IDs".
      return [
        { id: 'A1', label: 'Clássico' },
        { id: 'A2', label: 'Executivo' },
        { id: 'A3', label: 'Veterano' },
        { id: 'A4', label: 'Jovem' }
      ];
    },

    getRoles() {
      return [
        { id: 'coach', name: 'Treinador', desc: 'Escalação, treinos, tática e jogos. Você responde por resultados.' },
        { id: 'sporting', name: 'Diretor Esportivo', desc: 'Contratações, comissão técnica, planejamento e projeto.' },
        { id: 'president', name: 'Presidente', desc: 'Gestão total: orçamento, infraestrutura, diretrizes e poder máximo.' }
      ];
    },

    getClubsFromPack() {
      const pack = this.state.packData;
      if (!pack) return [];
      const clubs = Array.isArray(pack.clubs) ? pack.clubs : [];
      // Normaliza
      return clubs
        .filter(c => c && c.id && c.name)
        .map(c => ({
          id: String(c.id),
          name: String(c.name),
          shortName: c.shortName ? String(c.shortName) : String(c.name),
          league: c.league ? String(c.league) : 'unknown',
          state: c.state ? String(c.state) : '',
          rating: typeof c.rating === 'number' ? c.rating : null,
          budget: typeof c.budget === 'number' ? c.budget : null
        }));
    },

    createCareerDraft(input) {
      // input: {firstName,lastName,countryId,avatarId,roleId,clubId}
      const required = ['firstName', 'lastName', 'countryId', 'avatarId', 'roleId', 'clubId'];
      for (const k of required) {
        if (!input || !input[k] || String(input[k]).trim().length === 0) {
          return { ok: false, error: `Campo obrigatório ausente: ${k}` };
        }
      }

      const clubs = this.getClubsFromPack();
      const club = clubs.find(c => c.id === input.clubId);
      if (!club) return { ok: false, error: 'Clube inválido para o pack atual.' };

      const role = this.getRoles().find(r => r.id === input.roleId);
      if (!role) return { ok: false, error: 'Cargo inválido.' };

      const country = this.getCountriesForCareer().find(c => c.id === input.countryId);
      if (!country) return { ok: false, error: 'País inválido.' };

      const career = {
        schema: 'vfm26.career.v1',
        createdAt: nowISO(),
        manager: {
          firstName: String(input.firstName).trim(),
          lastName: String(input.lastName).trim(),
          countryId: country.id,
          countryName: country.name,
          avatarId: String(input.avatarId).trim(),
          reputation: 50,   // base (futuro: influencia ofertas)
          level: 1,
          xp: 0
        },
        role: {
          id: role.id,
          name: role.name
        },
        club: deepClone(club),
        progress: {
          seasonYear: this.state.packData?.defaultSeasonYear || 2026,
          dayIndex: 0
        }
      };

      return { ok: true, career };
    },

    commitCareerToSlot(career) {
      const slot = this.state.slot;
      if (slot !== 1 && slot !== 2) {
        NS.BootCheck.fatal('SAVE_E02_SLOT_NOT_SELECTED', 'Nenhum slot selecionado para salvar a carreira.');
        return false;
      }
      if (!this.state.packId) {
        NS.BootCheck.fatal('SAVE_E03_PACK_NOT_SELECTED', 'Nenhum DataPack selecionado.');
        return false;
      }

      let save = this.readSlot(slot);
      if (!save) save = this.createNewSaveSkeleton();

      save.packId = this.state.packId;
      save.career = career;
      save.updatedAt = nowISO();

      // "world" será criado na fase do calendário / ligas
      if (!save.world) save.world = { schema: 'vfm26.world.v0', createdAt: nowISO(), updatedAt: nowISO() };

      const ok = this.writeSlot(slot, save);
      if (!ok) return false;

      this.state.save = save;
      this.state.career = career;
      return true;
    },

    shouldShowTutorial() {
      // Mostra uma vez por carreira
      const c = this.state.career;
      if (!c) return false;
      const slot = this.state.slot;
      const save = this.readSlot(slot);
      if (!save) return true;
      const meta = save.meta || {};
      return meta.tutorialShown !== true;
    },

    markTutorialShown() {
      const slot = this.state.slot;
      const save = this.readSlot(slot);
      if (!save) return;
      save.meta = save.meta || {};
      save.meta.tutorialShown = true;
      save.updatedAt = nowISO();
      this.writeSlot(slot, save);
      this.state.save = save;
    },

    // --------- Persistência de seleção (pack/slot) ----------
    _persistLastSelection() {
      try {
        const data = {
          packId: this.state.packId,
          slot: this.state.slot
        };
        localStorage.setItem('vfm26_last', JSON.stringify(data));
      } catch (_) {}
    },

    _rehydrateLastSelection() {
      try {
        const raw = localStorage.getItem('vfm26_last');
        if (!raw) return;
        const data = safeJSONParse(raw, null);
        if (!data) return;
        if (data.packId) this.state.packId = data.packId;
        if (data.slot === 1 || data.slot === 2) this.state.slot = data.slot;
      } catch (_) {}
    }
  };

  NS.Game = Game;
})();