/* =======================================================
   MATCH CENTER AAA – UI AO VIVO
   Usa dados do Match.state (tempo real)
   ======================================================= */

(function () {
  console.log("[MATCH-CENTER-UI] carregado");

  function $(id) {
    return document.getElementById(id);
  }

  function pct(a, b) {
    const t = a + b;
    if (!t) return 50;
    return Math.round((a / t) * 100);
  }

  function update() {
    if (!window.Match || !Match.state || Match.state.finished) return;

    const s = Match.state.stats;
    if (!s) return;

    const pHome = pct(s.home.possessionTicks, s.away.possessionTicks);
    const pAway = 100 - pHome;

    // posse
    $("mc-posse-home").textContent = pHome + "%";
    $("mc-posse-away").textContent = pAway + "%";

    // chutes
    $("mc-chutes-home").textContent = s.home.shots;
    $("mc-chutes-away").textContent = s.away.shots;

    // no alvo
    $("mc-alvo-home").textContent = s.home.shotsOn;
    $("mc-alvo-away").textContent = s.away.shotsOn;

    // xG
    $("mc-xg-home").textContent = s.home.xg.toFixed(2);
    $("mc-xg-away").textContent = s.away.xg.toFixed(2);

    // escanteios
    $("mc-esc-home").textContent = s.home.corners;
    $("mc-esc-away").textContent = s.away.corners;

    // faltas
    $("mc-faltas-home").textContent = s.home.fouls;
    $("mc-faltas-away").textContent = s.away.fouls;
  }

  // loop leve (não pesa)
  setInterval(update, 800);

})();