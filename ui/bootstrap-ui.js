/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/bootstrap-ui.js — Blindagem global de UI
   -------------------------------------------------------
   - Garante que TeamUi.renderTeamSelection SEMPRE exista
   - Evita crash no botão "INICIAR CARREIRA"
   - Não interfere quando a implementação real carregar
   =======================================================*/

(function () {
  console.log("%c[BOOTSTRAP UI] iniciado", "color:#f59e0b; font-weight:bold;");

  // Compatibilidade: alguns lugares chamam TeamUi, outros TeamUI
  if (!window.TeamUi) window.TeamUi = {};
  if (!window.TeamUI) window.TeamUI = window.TeamUi;

  // Fallback: evita erro fatal caso o arquivo real não carregue
  const fallback = function () {
    alert(
      "A tela de seleção de clubes ainda não carregou.\n\n" +
      "Possíveis causas:\n" +
      "- Cache do Vercel/navegador\n" +
      "- Ui/team-ui.js não está sendo servido\n\n" +
      "Teste em aba anônima ou limpe o cache e recarregue."
    );
    console.warn("[BOOTSTRAP UI] fallback renderTeamSelection executado");
  };

  if (typeof window.TeamUi.renderTeamSelection !== "function") {
    window.TeamUi.renderTeamSelection = fallback;
  }
  if (typeof window.TeamUI.renderTeamSelection !== "function") {
    window.TeamUI.renderTeamSelection = window.TeamUi.renderTeamSelection;
  }
})();