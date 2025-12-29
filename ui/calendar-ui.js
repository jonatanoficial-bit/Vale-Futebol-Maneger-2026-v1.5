/* ui/calendar-ui.js — placeholder */
(function () {
  'use strict';
  const NS = (window.VFM26 = window.VFM26 || {});
  NS.UI && NS.UI.register && NS.UI.register('calendar', () => {
    return `
      <div class="screen">
        <div class="topbar">
          <div class="brand">
            <div class="title">Calendário</div>
            <div class="subtitle">Placeholder. Próxima fase: calendário real BR + próximo jogo.</div>
          </div>
          <div class="pill"><span class="dot"></span><span>Em breve</span></div>
        </div>

        <div class="card">
          <h2>Calendário real brasileiro</h2>
          <p>Vamos montar estaduais, Série A/B e Copa do Brasil com datas e rodada a rodada.</p>
        </div>

        <div class="actions">
          <button class="btn btn-secondary" id="btnBack">Voltar</button>
        </div>
      </div>
    `;
  });
  if (NS.UI?.screens?.calendar) {
    NS.UI.screens.calendar.afterRender = () => {
      document.getElementById('btnBack').onclick = () => NS.UI.go('lobby');
    };
  }
})();