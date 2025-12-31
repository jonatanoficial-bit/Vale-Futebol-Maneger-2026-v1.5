/* ui/tactics-ui.js — placeholder */
(function () {
  'use strict';
  const NS = (window.VFM26 = window.VFM26 || {});
  NS.UI && NS.UI.register && NS.UI.register('tactics', () => {
    return `
      <div class="screen">
        <div class="topbar">
          <div class="brand">
            <div class="title">Táticas</div>
            <div class="subtitle">Placeholder. Próxima fase: formação, instruções e XI inicial.</div>
          </div>
          <div class="pill"><span class="dot"></span><span>Em breve</span></div>
        </div>

        <div class="card">
          <h2>Formação e instruções</h2>
          <p>Vamos criar sistema de posições + papéis e impacto real na simulação.</p>
        </div>

        <div class="actions">
          <button class="btn btn-secondary" id="btnBack">Voltar</button>
        </div>
      </div>
    `;
  });
  if (NS.UI?.screens?.tactics) {
    NS.UI.screens.tactics.afterRender = () => {
      document.getElementById('btnBack').onclick = () => NS.UI.go('lobby');
    };
  }
})();