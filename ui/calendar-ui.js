/* ui/calendar-ui.js — Fase 4: calendário + próximo jogo */
(function () {
  'use strict';
  const NS = (window.VFM26 = window.VFM26 || {});

  function compName(id){
    if (id === 'state') return 'Estadual';
    if (id === 'cupBR') return 'Copa do Brasil';
    if (id === 'leagueA') return 'Série A';
    if (id === 'leagueB') return 'Série B';
    return id;
  }

  NS.UI && NS.UI.register && NS.UI.register('calendar', () => {
    const c = NS.Game.state.career;
    if (!c) return `<div class="screen"><div class="card"><h2>Sem carreira</h2></div></div>`;

    NS.Game.ensureWorld();
    const today = NS.Game.getToday();
    const next = NS.Game.getNextMatchday();

    const club = c.club?.name || '—';
    const crest = c.club?.crest || `assets/crests/${c.club?.id}.png`;

    const todayEvents = (today.day?.events || []).filter(e => e.type === 'matchday');

    return `
      <div class="screen">
        <div class="topbar">
          <div class="brand">
            <div class="title">Calendário</div>
            <div class="subtitle">${club} • Dia ${today.dayIndex}</div>
          </div>
          <div class="pill"><span class="dot"></span><span>Fase 4</span></div>
        </div>

        <div class="card">
          <div style="display:flex;gap:12px;align-items:center;">
            <img src="${crest}" style="width:42px;height:42px;border-radius:12px;object-fit:contain;background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.10)"
                 onerror="this.onerror=null;this.src='assets/crests/_placeholder.png';" />
            <div>
              <h2 style="margin:0;">Hoje</h2>
              <p style="margin-top:6px;">Dia <b>${today.dayIndex}</b> • Eventos: <b>${todayEvents.length}</b></p>
            </div>
          </div>

          <div class="toast" style="margin-top:12px;">
            ${todayEvents.length
              ? todayEvents.map(e => `Matchday: <b>${compName(e.competitionId)}</b> (Rodada ${e.round})`).join('<br>')
              : 'Sem jogos hoje.'}
          </div>
        </div>

        <div class="card">
          <h2>Próximo Jogo</h2>
          <p>${next ? `Daqui a <b>${Math.max(0, next.dayIndex - today.dayIndex)}</b> dia(s) • <b>${compName(next.event.competitionId)}</b> (Rodada ${next.event.round})` : 'Nenhum jogo encontrado.'}</p>
          <div class="toast" style="margin-top:12px;">
            Na próxima fase vamos gerar <b>adversário real + mando + tabela</b>.
            Por enquanto o “Jogar” entra na simulação simples.
          </div>
          <div style="margin-top:12px;display:flex;gap:10px;flex-wrap:wrap;">
            <button class="btn btn-secondary" id="btnAdvance">Avançar Dia</button>
            <button class="btn btn-primary" id="btnPlay" ${next && next.dayIndex === today.dayIndex ? '' : 'disabled style="opacity:.6;cursor:not-allowed;"'}>Jogar (simples)</button>
          </div>
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

      document.getElementById('btnAdvance').onclick = () => {
        NS.Game.advanceDay();
        NS.UI.go('calendar');
      };

      const btnPlay = document.getElementById('btnPlay');
      if (btnPlay) {
        btnPlay.onclick = () => {
          // por enquanto vamos só simular contra um “clube genérico” do pack (fase 5 vira adversário real)
          const clubs = NS.Game.getClubsFromPack();
          const myClub = NS.Game.state.career.club;
          const opp = clubs.find(x => x.id !== myClub.id) || clubs[0];

          const result = NS.Engine.Match.simulate(myClub, opp);

          alert(`Resultado (simples)\n\n${result.clubA.name} ${result.clubA.goals} x ${result.clubB.goals} ${result.clubB.name}`);
        };
      }
    };
  }
})();