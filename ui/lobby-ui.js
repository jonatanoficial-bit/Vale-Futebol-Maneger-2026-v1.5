/* ui/lobby-ui.js — Lobby (hub inicial) */
(function () {
  'use strict';

  const NS = (window.VFM26 = window.VFM26 || {});

  const LobbyUI = {
    register(UI) {
      UI.register('lobby', () => {
        const c = NS.Game.state.career;
        if (!c) {
          return `
            <div class="screen">
              <div class="card">
                <h2>Sem carreira carregada</h2>
                <p>Volte e crie/abra uma carreira.</p>
                <div class="actions">
                  <button class="btn btn-secondary" id="btnBack">Voltar</button>
                </div>
              </div>
            </div>
          `;
        }

        const club = c.club?.name || '—';
        const role = c.role?.name || '—';
        const name = `${c.manager?.firstName || ''} ${c.manager?.lastName || ''}`.trim();
        const year = c.progress?.seasonYear || 2026;

        return `
          <div class="screen">
            <div class="topbar">
              <div class="brand">
                <div class="title">Lobby</div>
                <div class="subtitle">${club} • ${role} • Temporada ${year}</div>
              </div>
              <div class="pill"><span class="dot"></span><span>${name}</span></div>
            </div>

            <div class="grid grid-2">
              <div class="card">
                <h2>Próximo passo</h2>
                <p>Na próxima fase vamos montar o <b>Calendário real do Brasil</b> (Estaduais, Série A/B, Copa do Brasil) e criar “Próximo Jogo”.</p>
                <div class="toast" style="margin-top:12px;">
                  Carreira salva no slot: <b>${NS.Game.state.slot}</b> • Pack: <span class="mono">${NS.Game.state.packId}</span>
                </div>
              </div>

              <div class="card">
                <h2>Acesso rápido</h2>
                <p>Por enquanto, telas abaixo são placeholders (não quebram boot). Vamos ativar uma por fase.</p>

                <div class="grid" style="margin-top:12px;">
                  <button class="btn btn-secondary btn-wide" id="btnCalendar">Calendário</button>
                  <button class="btn btn-secondary btn-wide" id="btnMarket">Mercado</button>
                  <button class="btn btn-secondary btn-wide" id="btnTactics">Táticas</button>
                </div>
              </div>
            </div>

            <div class="actions">
              <button class="btn btn-secondary" id="btnExit">Voltar aos Slots</button>
            </div>
          </div>
        `;
      });

      UI.screens.lobby.afterRender = () => {
        const back = document.getElementById('btnBack');
        if (back) back.onclick = () => NS.UI.go('saveslot');

        document.getElementById('btnExit').onclick = () => NS.UI.go('saveslot');

        document.getElementById('btnCalendar').onclick = () => NS.UI.go('calendar');
        document.getElementById('btnMarket').onclick = () => NS.UI.go('market');
        document.getElementById('btnTactics').onclick = () => NS.UI.go('tactics');
      };
    }
  };

  NS.LobbyUI = LobbyUI;
})();