/* ui/match-ui.js — placeholder */
(function () {
  'use strict';
  const NS = (window.VFM26 = window.VFM26 || {});
  NS.UI && NS.UI.register && NS.UI.register('match', () => {
    return `
      <div class="screen">
        <div class="topbar">
          <div class="brand">
            <div class="title">Partida</div>
            <div class="subtitle">Placeholder. Próxima fase: simulação de jogo e eventos.</div>
          </div>
          <div class="pill"><span class="dot"></span><span>Em breve</span></div>
        </div>

        <div class="card">
          <h2>Simulação</h2>
          <p>Eventos em tempo, estatísticas e escolhas do treinador (quando cargo permitir).</p>
        </div>

        <div class="actions">
          <button class="btn btn-secondary" id="btnBack">Voltar</button>
        </div>
      </div>
    `;
  });
  if (NS.UI?.screens?.match) {
    NS.UI.screens.match.afterRender = () => {
      document.getElementById('btnBack').onclick = () => NS.UI.go('lobby');
    };
  }
})();