import { PackManager } from "./packManager.js";
import { SaveSlots } from "./saveSlots.js";
import { GameCore } from "./gameCore.js";

(function () {
  const packs = new PackManager();
  const slots = new SaveSlots();
  const core = new GameCore({ packs, slots });

  const tmp = {
    career: null,
    role: null
  };

  window.Game = {
    boot() {
      core.boot();
      return core.state;
    },

    // UI/state
    getState() {
      return core.state;
    },
    setScreen(screen) {
      core.setScreen(screen);
      return core.state;
    },

    // Packs
    listPacks() {
      return packs.listPacks();
    },
    selectPack(packId) {
      core.selectPack(packId);
      return core.state;
    },

    // Slots
    listSlots() {
      return slots.list();
    },
    selectSlot(slotId) {
      core.selectSlot(slotId);
      return core.state;
    },
    loadSlot(slotId) {
      return core.loadFromSlot(slotId);
    },
    save() {
      // salva estado atual do slot
      if (!core.activeSlot) return;
      slots.save(core.activeSlot, core.state);
    },

    // Career building steps
    setTmpCareer(profile) {
      tmp.career = profile;
    },
    setTmpRole(role) {
      tmp.role = role;
    },
    finishCareer(clubId) {
      if (!tmp.career) throw new Error("Perfil temporário não definido.");
      if (!tmp.role) throw new Error("Cargo temporário não definido.");
      const { avatarId, name, country } = tmp.career;
      core.createCareer({ avatarId, name, country, role: tmp.role, clubId });
      return core.state;
    },

    // Pack data helpers
    getClubs() {
      return core.getClubs();
    },
    getClubById(id) {
      return core.getClubById(id);
    },
    getCareer() {
      return core.getCareer();
    },

    // Calendar
    getCalendarEvents() {
      return core.getCalendarEvents();
    },
    getNextClubMatch() {
      return core.getNextClubMatch();
    },
    advanceOneEvent() {
      // avança data para o próximo evento (bloco ou match)
      const c = core.getCareer();
      if (!c) return false;
      const cur = c.currentDate;
      const events = core.getCalendarEvents().filter(e => e.date > cur);
      if (!events.length) return false;
      const next = events.sort((a, b) => a.date.localeCompare(b.date))[0];
      core.setCurrentDate(next.date);
      return true;
    },

    // Match Flow
    openNextMatch() {
      return core.openNextMatch();
    },
    getActiveMatch() {
      return core.getActiveMatch();
    },
    simulateActiveMatch(opts) {
      return core.simulateActiveMatch(opts);
    }
  };

  console.log("%c[VFM26] engine/index.js carregado", "color:#22c55e; font-weight:bold;");
})();