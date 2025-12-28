/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/bootstrap-ui.js — Blindagem global (compat TeamUi/TeamUI)
   =======================================================*/

(function () {
  console.log("%c[BOOTSTRAP UI] carregado", "color:#f59e0b; font-weight:bold;");

  if (!window.TeamUi) window.TeamUi = {};
  if (!window.TeamUI) window.TeamUI = window.TeamUi;

  // não sobrescreve se já existir
  if (typeof window.TeamUi.renderTeamSelection !== "function") {
    window.TeamUi.renderTeamSelection = function () {
      alert(
        "Seleção de time ainda não carregou.\n\n" +
        "Abra em aba anônima / limpe cache do navegador (Vercel)."
      );
      console.warn("[BOOTSTRAP UI] fallback renderTeamSelection executado");
    };
  }

  // espelha
  window.TeamUI.renderTeamSelection = window.TeamUi.renderTeamSelection;

  // também garante TeamUI.renderSquad existir (para não quebrar UI antiga)
  if (typeof window.TeamUI.renderSquad !== "function") {
    window.TeamUI.renderSquad = function () {
      console.warn("[BOOTSTRAP UI] TeamUI.renderSquad fallback (sem implementação real).");
    };
  }
})();