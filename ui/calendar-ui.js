(function () {
  'use strict';

  window.VFM26 = window.VFM26 || {};
  const NS = window.VFM26;

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function fmtDate(iso) {
    try {
      const d = new Date(iso + 'T00:00:00');
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    } catch {
      return iso;
    }
  }

  function addDaysISO(iso, add) {
    const d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + add);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function renderList(fixtures, clubsById) {
    if (!fixtures.length) {
      return `<div class="muted">Nenhum jogo marcado.</div>`;
    }
    return fixtures.map(f => {
      const home = clubsById[f.home]?.shortName || f.home;
      const away = clubsById[f.away]?.shortName || f.away;
      return `
        <div class="card small">
          <div class="row">
            <div class="col">
              <div class="title">${esc(f.comp)} • Rodada ${esc(f.round)}</div>
              <div class="muted">${esc(home)} x ${esc(away)}</div>
            </div>
            <div class="col right muted">${esc(fmtDate(f.dateISO))}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  const CalendarUI = {
    id: 'calendar',

    render(container) {
      const game = NS.Game;
      const career = game.getCareer();

      if (!career) {
        container.innerHTML = `
          <div class="screen">
            <h1>Calendário</h1>
            <p>Sem carreira ativa.</p>
            <button class="btn" data-act="back">Voltar</button>
          </div>
        `;
        container.querySelector('[data-act="back"]').onclick = () => NS.UI.go('cover');
        return;
      }

      // garante mundo/temporada
      game.ensureWorld();

      const world = career.world || {};
      const today = game.getToday();
      const clubs = game.getClubsFromPack();
      const clubsById = {};
      clubs.forEach(c => clubsById[c.id] = c);

      const clubId = career.clubId;
      const clubName = clubsById[clubId]?.name || clubId;

      const todayISO = today.dateISO;
      const todayFix = game.getFixturesForDate(todayISO).filter(f => f.home === clubId || f.away === clubId);
      const nextMatch = game.getNextMatchday(clubId);

      const last = world.lastMatch || null;

      const next7 = [];
      for (let i = 0; i < 7; i++) {
        const dISO = addDaysISO(todayISO, i);
        const fx = game.getFixturesForDate(dISO).filter(f => f.home === clubId || f.away === clubId);
        if (fx.length) next7.push({ dISO, fx });
      }

      container.innerHTML = `
        <div class="screen">
          <div class="topbar">
            <button class="btn ghost" data-act="back">Voltar</button>
            <div class="spacer"></div>
          </div>

          <div class="panel">
            <h1>Calendário</h1>
            <div class="muted">Clube: <b>${esc(clubName)}</b></div>
            <div class="muted">Hoje: <b>${esc(fmtDate(todayISO))}</b> (dia ${esc(today.dayIndex)})</div>
          </div>

          <div class="panel">
            <h2>Próxima partida</h2>
            ${
              nextMatch
                ? `<div class="card">
                    <div class="title">${esc(nextMatch.comp)} • Rodada ${esc(nextMatch.round)}</div>
                    <div>${esc(clubsById[nextMatch.home]?.shortName || nextMatch.home)} x ${esc(clubsById[nextMatch.away]?.shortName || nextMatch.away)}</div>
                    <div class="muted">${esc(fmtDate(nextMatch.dateISO))}</div>
                  </div>`
                : `<div class="muted">Nenhuma partida futura encontrada.</div>`
            }

            <div class="row gap">
              <button class="btn" data-act="advance">Avançar 1 dia</button>
              <button class="btn primary" data-act="sim-next">Simular próxima partida</button>
            </div>
          </div>

          <div class="panel">
            <h2>Jogos hoje</h2>
            ${renderList(todayFix, clubsById)}
          </div>

          <div class="panel">
            <h2>Próximos 7 dias</h2>
            ${
              next7.length
                ? next7.map(block => `
                    <div class="card">
                      <div class="title">${esc(fmtDate(block.dISO))}</div>
                      ${renderList(block.fx, clubsById)}
                    </div>
                  `).join('')
                : `<div class="muted">Nenhum jogo do seu clube nos próximos 7 dias.</div>`
            }
          </div>

          <div class="panel">
            <h2>Último resultado</h2>
            ${
              last
                ? `<div class="card">
                    <div class="title">${esc(last.comp)} • Rodada ${esc(last.round)}</div>
                    <div><b>${esc(clubsById[last.home]?.shortName || last.home)} ${esc(last.homeGoals)} x ${esc(last.awayGoals)} ${esc(clubsById[last.away]?.shortName || last.away)}</b></div>
                    <div class="muted">${esc(fmtDate(last.dateISO))}</div>
                  </div>`
                : `<div class="muted">Ainda não há partidas simuladas.</div>`
            }
          </div>
        </div>
      `;

      container.querySelector('[data-act="back"]').onclick = () => NS.UI.go('lobby');

      container.querySelector('[data-act="advance"]').onclick = () => {
        game.advanceDay(1);
        NS.UI.go('calendar');
      };

      container.querySelector('[data-act="sim-next"]').onclick = () => {
        const ok = game.simulateNextMatch();
        if (!ok) {
          alert('Nenhuma partida futura para simular.');
        }
        NS.UI.go('calendar');
      };
    },

    onEnter() {},
    onExit() {}
  };

  NS.UI.register(CalendarUI.id, CalendarUI);
})();