/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/bootstrap-ui.js — Blindagem global de UI
   -------------------------------------------------------
   Função:
   - Garante que TeamUI.renderTeamSelection SEMPRE exista
   - Evita crash no botão "INICIAR CARREIRA"
   - Não interfere em implementações reais depois

   ESTE ARQUIVO DEVE SER CARREGADO ANTES DE QUALQUER OUTRO UI
   =======================================================*/

(function () {
  console.log("%c[BOOTSTRAP UI] iniciado", "color:#f59e0b; font-weight:bold;");

  if (!window.TeamUI) window.TeamUI = {};

  if (typeof window.TeamUI.renderTeamSelection !== "function") {
    window.TeamUI.renderTeamSelection = function () {
      alert(
        "Tela de seleção de clube ainda não carregou.\n\n" +
        "Recarregue a página (Ctrl+F5 ou limpar cache).\n" +
        "Se persistir, verifique se Ui/team-ui.js está importado."
      );
      console.warn("[BOOTSTRAP UI] renderTeamSelection fallback executado");
    };
  }
})();