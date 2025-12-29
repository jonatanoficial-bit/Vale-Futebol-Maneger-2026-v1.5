/* ui/market-ui.js — placeholder */
(function () {
  'use strict';
  const NS = (window.VFM26 = window.VFM26 || {});
  NS.UI && NS.UI.register && NS.UI.register('market', () => {
    return `
      <div class="screen">
        <div class="topbar">
          <div class="brand">
            <div class="title">Mercado</div>
            <div class="subtitle">Placeholder. Próxima fase: buscas, ofertas, histórico e orçamento.</div>
          </div>
          <div class="pill"><span class="dot"></span><span>Em breve</span></div>
        </div>

        <div class="card">
          <h2>Mercado de transferências</h2>
          <p>Entradas/saídas, empréstimos, pesquisa, olheiros e contratos — tudo por módulos.</p>
        </div>

        <div class="actions">
          <button class="btn btn-secondary" id="btnBack">Voltar</button>
        </div>
      </div>
    `;
  });
  if (NS.UI?.screens?.market) {
    NS.UI.screens.market.afterRender = () => {
      document.getElementById('btnBack').onclick = () => NS.UI.go('lobby');
    };
  }
})();