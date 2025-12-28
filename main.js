(() => {
  "use strict";

  function report() {
    const s = window.Game?.state;
    const slot = s?.selection?.slotIndex;
    const pack = s?.selection?.pack?.id;
    const club = s?.selection?.career?.clubId;
    const role = s?.selection?.career?.role;
    return [
      "DEBUG — VFM26 Rebuild",
      "screen: " + (s?.flow?.screen || "?"),
      "pack: " + (pack || "—"),
      "slot: " + (slot === 0 ? "1" : slot === 1 ? "2" : "—"),
      "role: " + (role || "—"),
      "club: " + (club || "—"),
      "teamsLoaded: " + ((s?.data?.teams || []).length)
    ].join("\n");
  }

  window.addEventListener("error", (e) => {
    console.error(e.error || e.message || e);
    try {
      alert("Erro: " + (e?.message || "desconhecido"));
    } catch {}
  });

  window.addEventListener("unhandledrejection", (e) => {
    console.error(e.reason || e);
    try {
      alert("Erro: " + (e?.reason?.message || e?.reason || "desconhecido"));
    } catch {}
  });

  document.addEventListener("DOMContentLoaded", async () => {
    // Debug button
    const btn = document.getElementById("btnDebug");
    btn.onclick = () => alert(report());

    // Start game
    await window.Game.boot();

    // Se quiser, já cai direto no pack (comente se não quiser)
    // window.Game.setScreen("pack");
  });
})();