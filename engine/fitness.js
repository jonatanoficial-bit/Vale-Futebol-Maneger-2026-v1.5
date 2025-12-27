/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/fitness.js — Lesões, Suspensões e Fadiga (AAA)
   -------------------------------------------------------
   Sistema persistente de condição física:
   - Lesões com duração (em semanas)
   - Suspensão por cartões
   - Fadiga acumulada / recuperação
   - Integra treino + partidas
   =======================================================*/

(function () {
  console.log("%c[Fitness] fitness.js carregado", "color:#ef4444; font-weight:bold;");

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.playerFitness) gs.playerFitness = {};
    return gs;
  }

  function ensurePlayer(pid) {
    const gs = ensureGS();
    const id = String(pid);
    if (!gs.playerFitness[id]) {
      gs.playerFitness[id] = {
        fatigue: 10,
        injuryWeeks: 0,
        suspended: false,
        yellowCards: 0
      };
    }
    const f = gs.playerFitness[id];
    f.fatigue = clamp(n(f.fatigue, 10), 0, 100);
    f.injuryWeeks = clamp(n(f.injuryWeeks, 0), 0, 52);
    f.yellowCards = clamp(n(f.yellowCards, 0), 0, 10);
    f.suspended = !!f.suspended;
    return f;
  }

  function isAvailable(pid) {
    const f = ensurePlayer(pid);
    return f.injuryWeeks === 0 && !f.suspended;
  }

  function applyMatchLoad(pid, playedMinutes) {
    const f = ensurePlayer(pid);
    const load = clamp(Math.round(playedMinutes / 9), 5, 18);
    f.fatigue = clamp(f.fatigue + load, 0, 100);

    // risco de lesão
    if (f.fatigue > 80 && Math.random() < 0.08) {
      const weeks = Math.floor(Math.random() * 4) + 1;
      f.injuryWeeks = weeks;
      try {
        if (window.News) {
          News.pushNews(
            "Lesão!",
            `Jogador sofreu lesão e ficará fora por ${weeks} semana(s).`,
            "INJURY"
          );
        }
      } catch (e) {}
    }
  }

  function weeklyRecovery() {
    const gs = ensureGS();
    Object.values(gs.playerFitness).forEach(f => {
      f.fatigue = clamp(f.fatigue - 12, 0, 100);
      if (f.injuryWeeks > 0) f.injuryWeeks -= 1;
      if (f.suspended && f.yellowCards === 0) f.suspended = false;
    });
  }

  function giveYellow(pid) {
    const f = ensurePlayer(pid);
    f.yellowCards += 1;
    if (f.yellowCards >= 3) {
      f.suspended = true;
      f.yellowCards = 0;
      try {
        if (window.News) {
          News.pushNews(
            "Suspensão",
            "Jogador suspenso por acúmulo de cartões.",
            "DISCIPLINE"
          );
        }
      } catch (e) {}
    }
  }

  function giveRed(pid) {
    const f = ensurePlayer(pid);
    f.suspended = true;
    f.yellowCards = 0;
    try {
      if (window.News) {
        News.pushNews(
          "Expulsão",
          "Jogador suspenso após cartão vermelho.",
          "DISCIPLINE"
        );
      }
    } catch (e) {}
  }

  window.Fitness = {
    ensurePlayer,
    isAvailable,
    applyMatchLoad,
    weeklyRecovery,
    giveYellow,
    giveRed
  };
})();