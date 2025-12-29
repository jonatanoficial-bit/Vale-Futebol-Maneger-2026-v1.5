/* engine/database.js — Base de dados em memória (placeholder para evolução) */
(function () {
  'use strict';
  const NS = (window.VFM26 = window.VFM26 || {});

  const Database = {
    mem: {
      clubs: [],
      players: [],
      staff: []
    },

    hydrateFromPack(packData) {
      this.mem.clubs = Array.isArray(packData?.clubs) ? packData.clubs.slice() : [];
      // Jogadores/staff serão fase futura (geração + import)
      this.mem.players = Array.isArray(packData?.players) ? packData.players.slice() : [];
      this.mem.staff = Array.isArray(packData?.staff) ? packData.staff.slice() : [];
      return true;
    }
  };

  NS.Engine = NS.Engine || {};
  NS.Engine.Database = Database;
})();