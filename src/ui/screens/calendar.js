// /src/ui/screens/calendar.js
import { simulateMatch } from "../../domain/matchSim.js";

function safeText(v) {
  return String(v ?? "").replace(/[<>&"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;"
  }[c]));
}

function findNextMatchForClub(season, clubId) {
  const comps = Array.isArray(season?.competitions) ? season.competitions : [];
  for (const comp of comps) {
    const cal = Array.isArray(comp?.calendar) ? comp.calendar : [];
    for (const md of cal) {
      const matches = Array.isArray(md?.matches) ? md.matches : [];
      for (let i = 0; i < matches.length; i++) {
        const m = matches[i];
        if (!m) continue;
        const isMine = m.home === clubId || m.away === clubId;
        if (!isMine) continue;
        if (m.played) continue;
        return { compId: comp.id, compName: comp.name, matchday: md.matchday, matchIndex: i, match: m };
      }
    }
  }
  return null;
}

function money(n) {
  const v = Math.round(Number(n) || 0);
  return v.toLocaleString("pt-BR");
}

function ensureFinance(state) {
  const next = structuredClone(state);
  if (!next.career) next.career = {};
  if (!next.career.finance) {
    next.career.finance = {
      balance: 15000000,
      wageMonthly: 2675000,
      lastMatchIncome: 0,
      sponsor: { name: "Vale Bank (MVP)", monthly: 1250000, bonus: 75000 },
      ledger: []
    };
  }
  if (!Array.isArray(next.career.finance.ledger)) next.career.finance.ledger = [];
  return next;
}

export async function screenCalendar({ shell, store, navigate, repos }) {
  const st0 = store.getState();
  if (!st0?.career?.clubId) { navigate("#/clubSelect"); return { render() {} }; }
  if (!st0?.career?.season) { navigate("#/competitions"); return { render() {} }; }

  store.setState(ensureFinance(st0));

  const el = document.createElement("div");
  el.className = "grid";

  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Calendário</div>
          <div class="card__subtitle">Próximo jogo • Simulação (MVP)</div>
        </div>
        <span class="badge">Calendar</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2" style="gap:12px">
          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900;margin-bottom:6px">Próximo jogo</div>
              <div class="muted" id="next" style="font-size:12px;line-height:1.45">—</div>
              <div style="height:10px"></div>
              <button class="btn btn--primary" id="play">Jogar agora</button>
              <div style="height:8px"></div>
              <button class="btn" id="back">Voltar</button>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900;margin-bottom:6px">Último resultado</div>
              <div class="muted" id="last" style="font-size:12px;line-height:1.45">—</div>
            </div>
          </div>
        </div>

        <div style="height:12px"></div>

        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div style="font-weight:900;margin-bottom:6px">Dica</div>
            <div class="muted" style="font-size:12px;line-height:1.45">
              Este é o motor MVP de partida. Depois vamos evoluir para escalação real (11 titulares), eventos, lesões, moral, público e premiações.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  shell.mount(el);

  const $next = el.querySelector("#next");
  const $last = el.querySelector("#last");
  const $play = el.querySelector("#play");

  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  async function getPlayersFromPack() {
    const st = store.getState();
    const pack = await repos.loadPack(st.app.selectedPackId);
    const players =
      pack?.content?.players?.players ||
      pack?.content?.players ||
      [];
    return Array.isArray(players) ? players : [];
  }

  function render() {
    const st = store.getState();
    const clubId = st.career.clubId;
    const season = st.career.season;

    const next = findNextMatchForClub(season, clubId);
    if (!next) {
      $next.textContent = "Nenhum jogo pendente encontrado no calendário (MVP).";
      $play.disabled = true;
    } else {
      $play.disabled = false;
      const m = next.match;
      $next.textContent =
        `${safeText(next.compName)} • Rodada ${next.matchday}\n` +
        `${m.home} x ${m.away}`;
    }

    const last = st.career.lastMatch || null;
    if (!last) {
      $last.textContent = "Nenhum jogo disputado ainda.";
    } else {
      $last.textContent =
        `${safeText(last.compName)} • Rodada ${last.matchday}\n` +
        `${last.home} ${last.score.home} x ${last.score.away} ${last.away}\n` +
        `Renda: R$ ${money(last.income)} • Chances: ${last.meta?.chances ?? "—"}`;
    }
  }

  $play.addEventListener("click", async () => {
    const st = store.getState();
    const clubId = st.career.clubId;
    const season = st.career.season;

    const next = findNextMatchForClub(season, clubId);
    if (!next) return;

    // carrega players (do pack, que já inclui os auto-gerados pelo repos)
    const allPlayers = await getPlayersFromPack();
    const homePlayers = allPlayers.filter(p => p?.clubId === next.match.home);
    const awayPlayers = allPlayers.filter(p => p?.clubId === next.match.away);

    const sim = simulateMatch({
      homeId: next.match.home,
      awayId: next.match.away,
      homePlayers,
      awayPlayers,
      seedKey: `${st.app.selectedPackId}:${st.career.season.id}:${next.compId}:${next.matchday}`
    });

    // renda MVP: depende de placar + competição
    const baseIncome = next.compId.startsWith("BRA-") ? 650000 : next.compId === "CDB" ? 900000 : 750000;
    const bonus = (sim.score.home + sim.score.away) * 25000;
    const income = baseIncome + bonus;

    const nextState = ensureFinance(st);

    // marca como played no calendário
    const comp = nextState.career.season.competitions.find(c => c.id === next.compId);
    const md = comp?.calendar?.find(x => x.matchday === next.matchday);
    if (md && Array.isArray(md.matches) && md.matches[next.matchIndex]) {
      md.matches[next.matchIndex].played = true;
      md.matches[next.matchIndex].score = sim.score;
    }

    // salva “last match”
    nextState.career.lastMatch = {
      compId: next.compId,
      compName: next.compName,
      matchday: next.matchday,
      home: sim.home.id,
      away: sim.away.id,
      score: sim.score,
      meta: sim.meta,
      income
    };

    // finanças MVP (extrato)
    nextState.career.finance.lastMatchIncome = income;
    nextState.career.finance.balance = (Number(nextState.career.finance.balance) || 0) + income;
    nextState.career.finance.ledger.unshift({
      at: new Date().toISOString(),
      type: "MATCH_INCOME",
      label: `Renda de jogo (${next.compName})`,
      amount: income
    });
    nextState.career.finance.ledger = nextState.career.finance.ledger.slice(0, 40);

    store.setState(nextState);

    alert(`Jogo simulado!\n${sim.home.id} ${sim.score.home} x ${sim.score.away} ${sim.away.id}\nRenda: R$ ${money(income)}\nUse "Salvar" no Hub para gravar.`);
    render();
  });

  render();
  return { render };
}
