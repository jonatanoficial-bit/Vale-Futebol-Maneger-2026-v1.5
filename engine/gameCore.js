/* engine/gameCore.js — Núcleo do jogo */
(function () {
  'use strict';

  const NS = (window.VFM26 = window.VFM26 || {});
  const BootCheck = NS.BootCheck;

  const EngineCore = {
    createBaseWorld(packData) {
      BootCheck && BootCheck.step('ENGINECORE_CREATE_WORLD');

      const year = packData?.defaultSeasonYear || 2026;

      return {
        schema: 'vfm26.world.v1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        seasonYear: year,
        calendar: {
          schema: 'vfm26.calendar.v0',
          dayIndex: 0,
          year
        },
        competitions: {
          leagueA: { schema: 'vfm26.leagueA.v0', ready: false },
          leagueB: { schema: 'vfm26.leagueB.v0', ready: false },
          cupBR: { schema: 'vfm26.cupBR.v0', ready: false },
          state: { schema: 'vfm26.state.v0', ready: false }
        }
      };
    }
  };

  NS.EngineCore = EngineCore;
})();