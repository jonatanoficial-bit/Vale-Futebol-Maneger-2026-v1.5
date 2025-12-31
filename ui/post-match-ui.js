/* ui/post-match-ui.js — placeholder */
(function () {
  'use strict';
  const NS = (window.VFM26 = window.VFM26 || {});
  NS.UI && NS.UI.register && NS.UI.register('postmatch', () => {
    return `
      <div class="screen">
        <div class="topbar">
          <div class="brand">
            <div class="title">Pós-jogo</div>
            <div class="subtitle">Placeholder. Próxima fase: notas, moral, notícias e impactos.</div>
          </div>
          <div class="pill"><span class="dot"></span><span>Em breve</span></div>
        </div>

        <div class="card">
          <h2>Análise completa</h2>
          <p>Relatório de desempenho, conversas, moral e evolução.</p>
        </div>

        <div class="actions">
          <button class="btn btn-secondary" id="btnBack">Voltar</button>
        </div>
      </div>
    `;
  });
  if (NS.UI?.screens?.postmatch) {
    NS.UI.screens.postmatch.afterRender = () => {
      document.getElementById('btnBack').onclick = () => NS.UI.go('lobby');
    };
  }
})();