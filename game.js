/* game.js
   Núcleo lógico do jogo (SEM DOM)
*/

const Game = (() => {
  const state = {
    config: {
      coverUrl: "/assets/cover.jpg"
    },
    ui: {},
    packs: {
      available: [],
      selectedId: null
    },
    career: {
      isActive: false,
      slots: [null, null],
      activeSlot: null,
      managerName: "",
      managerCountry: "",
      role: "",
      clubId: "",
      clubName: ""
    },
    calendar: {
      currentDate: "2026-01-01",
      nextMatch: null,
      blocks: []
    },
    data: {
      clubs: [],
      countries: ["Brasil"]
    }
  };

  /* ---------- STATE ---------- */
  const getState = () => JSON.parse(JSON.stringify(state));

  /* ---------- ACTIONS ---------- */
  const actions = {
    packs: {
      select(id) {
        state.packs.selectedId = id;
      }
    },

    career: {
      newCareer(slot) {
        state.ui.creatingSlot = slot;
        UI.goto("createCareer");
      },

      setManagerProfile({ name, country }) {
        state.career.managerName = name;
        state.career.managerCountry = country;
      },

      setRole(role) {
        state.career.role = role;
      },

      setClub(clubId) {
        state.career.clubId = clubId;
        const club = state.data.clubs.find(c => c.id === clubId);
        state.career.clubName = club ? club.name : "Clube";
      },

      finalizeCreation() {
        const slot = state.ui.creatingSlot;
        state.career.isActive = true;
        state.career.activeSlot = slot;
        state.career.slots[slot] = {
          clubName: state.career.clubName,
          managerName: state.career.managerName,
          role: state.career.role
        };
      },

      saveNow() {
        localStorage.setItem("VFM_SAVE", JSON.stringify(state));
        alert("Jogo salvo.");
      },

      loadSlot(slot) {
        const data = state.career.slots[slot];
        if (!data) return;
        state.career.activeSlot = slot;
        state.career.isActive = true;
        UI.goto("lobby");
      },

      deleteSlot(slot) {
        state.career.slots[slot] = null;
        UI.goto("slots");
      }
    },

    calendar: {
      advanceDay() {
        const d = new Date(state.calendar.currentDate);
        d.setDate(d.getDate() + 1);
        state.calendar.currentDate = d.toISOString().slice(0, 10);
        UI.goto("calendar");
      },

      jumpToNextMatchDate() {
        if (state.calendar.nextMatch) {
          state.calendar.currentDate = state.calendar.nextMatch.date;
          UI.goto("calendar");
        }
      }
    }
  };

  /* ---------- INIT ---------- */
  const init = () => {
    // Clubs mock (usa os seus assets reais depois)
    state.data.clubs = [
      { id: "FLA", name: "Flamengo" },
      { id: "PAL", name: "Palmeiras" }
    ];

    state.packs.available = [
      { id: "br_2026", name: "Brasil 2026 (Série A+B)" }
    ];

    const saved = localStorage.getItem("VFM_SAVE");
    if (saved) {
      Object.assign(state, JSON.parse(saved));
    }
  };

  return { init, getState, actions };
})();

window.Game = Game;