/* engine/finances.js — Finanças (placeholder) */
(function () {
  'use strict';
  const NS = (window.VFM26 = window.VFM26 || {});
  const Finances = {
    computeClubBudget(club) {
      const b = typeof club?.budget === 'number' ? club.budget : 5000000;
      return { balance: b, wageBudget: Math.round(b * 0.35), transferBudget: Math.round(b * 0.25) };
    }
  };
  NS.Engine = NS.Engine || {};
  NS.Engine.Finances = Finances;
})();