(() => {
  "use strict";

  const DEFAULT_STATE = () => ({
    // fluxo inicial
    flow: {
      screen: "cover", // cover -> pack -> slots -> career -> role -> club -> tutorial -> lobby
      error: null
    },

    // seleção atual
    selection: {
      pack: null,        // { id, name, version }
      slotIndex: null,   // 0 ou 1
      career: {
        avatarId: "1",
        name: "",
        country: "Brasil",
        role: null,      // coach / director / president
        clubId: null
      }
    },

    // dados carregados do pack
    data: {
      teams: [],
      playersByTeamId: {}
    }
  });

  const Game = {
    state: DEFAULT_STATE(),

    setScreen(screen) {
      this.state.flow.screen = screen;
      window.UI.render(this.state);
    },

    setError(msg) {
      this.state.flow.error = msg;
      window.UI.render(this.state);
    },

    async boot() {
      // sempre começa na capa
      this.state = DEFAULT_STATE();
      window.UI.render(this.state);
    },

    async choosePack(packMeta, packData) {
      this.state.selection.pack = {
        id: packMeta.id,
        name: packMeta.name,
        version: packMeta.version || ""
      };
      this.state.data.teams = packData.teams || [];
      this.state.data.playersByTeamId = packData.playersByTeamId || {};
      this.setScreen("slots");
    },

    chooseSlot(slotIndex) {
      this.state.selection.slotIndex = slotIndex;

      const slot = window.SaveSlots.readSlot(slotIndex);
      if (slot.exists && slot.career && slot.packId) {
        // carregar carreira existente
        this.state.selection.pack = {
          id: slot.packId,
          name: slot.packName || "",
          version: slot.packVersion || ""
        };
        this.state.selection.career = slot.career;

        // tentar carregar o pack do save
        this.setScreen("loading");
        window.DataPacks.loadPack(slot.packId)
          .then(({ meta, data }) => {
            this.state.data.teams = data.teams || [];
            this.state.data.playersByTeamId = data.playersByTeamId || {};
            this.setScreen("lobby");
          })
          .catch((e) => {
            this.setError("Falha ao carregar o pack do save: " + (e?.message || e));
            this.setScreen("pack");
          });

        return;
      }

      // slot vazio → criar carreira
      this.setScreen("career");
    },

    setCareerInfo({ avatarId, name, country }) {
      this.state.selection.career.avatarId = avatarId;
      this.state.selection.career.name = name;
      this.state.selection.career.country = country;
      this.setScreen("role");
    },

    setRole(role) {
      this.state.selection.career.role = role;
      this.setScreen("club");
    },

    setClub(clubId) {
      this.state.selection.career.clubId = clubId;
      this.setScreen("tutorial");
    },

    finishTutorial() {
      // salva imediatamente
      const s = this.state.selection;
      window.SaveSlots.writeSlot(s.slotIndex ?? 0, {
        packId: s.pack?.id || null,
        packName: s.pack?.name || null,
        packVersion: s.pack?.version || null,
        career: s.career
      });
      this.setScreen("lobby");
    },

    saveNow() {
      const s = this.state.selection;
      if (s.slotIndex === null || s.slotIndex === undefined) return;
      window.SaveSlots.writeSlot(s.slotIndex, {
        packId: s.pack?.id || null,
        packName: s.pack?.name || null,
        packVersion: s.pack?.version || null,
        career: s.career
      });
    },

    getSelectedTeam() {
      const clubId = this.state.selection.career.clubId;
      if (!clubId) return null;
      return this.state.data.teams.find(t => (t.id || t.clubId) === clubId) || null;
    },

    getSquad() {
      const team = this.getSelectedTeam();
      if (!team) return [];
      const id = (team.id || team.clubId);
      return this.state.data.playersByTeamId[id] || [];
    }
  };

  window.Game = Game;
})();