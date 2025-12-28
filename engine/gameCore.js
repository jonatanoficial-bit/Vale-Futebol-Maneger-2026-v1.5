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
    },

    // temporada (Fase 1)
    season: {
      schemaVersion: 1,
      year: 2026,
      seed: null,
      currentDate: null, // "YYYY-MM-DD"
      calendar: null     // objeto do SeasonEngine
    }
  });

  function todayKeyDefault(year) {
    // Começa em 2026-01-01 por padrão (pode ajustar depois)
    return `${year}-01-01`;
  }

  function safeString(x) {
    return String(x ?? "");
  }

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

      // reset temporada ao trocar pack (seguro)
      this.state.season.year = 2026;
      this.state.season.seed = null;
      this.state.season.currentDate = null;
      this.state.season.calendar = null;

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

        // tenta carregar season se existir no save (compatível: pode não existir)
        if (slot.season && typeof slot.season === "object") {
          this.state.season = {
            ...this.state.season,
            ...slot.season
          };
        }

        // tentar carregar o pack do save
        this.setScreen("loading");
        window.DataPacks.loadPack(slot.packId)
          .then(({ data }) => {
            this.state.data.teams = data.teams || [];
            this.state.data.playersByTeamId = data.playersByTeamId || {};
            // garante temporada se não existir (safe)
            this.ensureSeasonReady();
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
      this.state.selection.career.avatarId = safeString(avatarId);
      this.state.selection.career.name = safeString(name);
      this.state.selection.career.country = safeString(country);
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
      // cria a temporada na primeira entrada (Fase 1)
      this.ensureSeasonReady();

      // salva imediatamente
      this.saveNow();
      this.setScreen("lobby");
    },

    ensureSeasonReady() {
      const packId = this.state.selection.pack?.id || "pack";
      const clubId = this.state.selection.career.clubId || "club";
      const year = this.state.season?.year || 2026;

      // Seed estável: pack + club + year
      const seed = `${packId}_${clubId}_${year}`;

      // Se já existe calendário compatível com seed, mantém
      if (this.state.season.calendar && this.state.season.seed === seed) {
        if (!this.state.season.currentDate) {
          this.state.season.currentDate = todayKeyDefault(year);
        }
        return;
      }

      // Gera calendário com fallback seguro
      const teams = this.state.data.teams || [];
      const cal = window.SeasonEngine.generateSeasonFromTeams(teams, year, seed);

      this.state.season.schemaVersion = 1;
      this.state.season.seed = seed;
      this.state.season.calendar = cal;
      this.state.season.currentDate = todayKeyDefault(year);
    },

    advanceDay() {
      // Avança para a próxima data existente no calendário (seguro)
      this.ensureSeasonReady();
      const cal = this.state.season.calendar;
      if (!cal || !Array.isArray(cal.events) || cal.events.length === 0) return;

      const current = this.state.season.currentDate || todayKeyDefault(this.state.season.year || 2026);

      // Pega todas as datas únicas do calendário
      const dates = [];
      const seen = {};
      for (const ev of cal.events) {
        if (!seen[ev.date]) {
          seen[ev.date] = true;
          dates.push(ev.date);
        }
      }
      dates.sort();

      // encontra a próxima >= current; se current é anterior ao primeiro, pula pro primeiro
      let idx = dates.findIndex(d => d >= current);
      if (idx === -1) idx = dates.length - 1;

      // Avança um passo (ou fica no último)
      const nextIdx = Math.min(idx + 1, dates.length - 1);
      this.state.season.currentDate = dates[nextIdx];

      this.saveNow();
      window.UI.render(this.state);
    },

    saveNow() {
      const s = this.state.selection;
      if (s.slotIndex === null || s.slotIndex === undefined) return;

      window.SaveSlots.writeSlot(s.slotIndex, {
        packId: s.pack?.id || null,
        packName: s.pack?.name || null,
        packVersion: s.pack?.version || null,
        career: s.career,
        // novo campo: season (compatível: saves antigos não têm)
        season: this.state.season
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
    },

    // ====== Calendário API (para UI) ======
    getCalendarEventsForSelectedTeam() {
      this.ensureSeasonReady();
      const cal = this.state.season.calendar;
      if (!cal || !Array.isArray(cal.events)) return [];

      const clubId = this.state.selection.career.clubId;
      if (!clubId) return [];

      // Filtra eventos que tenham jogo do clube OU blocos
      const out = [];
      for (const ev of cal.events) {
        if (ev.type === "block") {
          out.push(ev);
          continue;
        }
        const matches = Array.isArray(ev.matches) ? ev.matches : [];
        const hasTeam = matches.some(m => m.home === clubId || m.away === clubId);
        if (hasTeam) out.push(ev);
      }
      return out;
    }
  };

  window.Game = Game;
})();