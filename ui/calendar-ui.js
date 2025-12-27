/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/calendar-ui.js — Calendário AAA (Anual + Competições)
   -------------------------------------------------------
   O que entrega:
   - Calendário anual visual (lista por data)
   - Eventos: Série A/B, Copa do Brasil, Estaduais (se existirem)
   - Fallback inteligente:
     • se engine Calendar fornecer eventos, usa
     • senão, tenta ler gameState.schedule
     • senão, cria um modelo básico (para não ficar vazio)

   OBS:
   - Esse arquivo prepara a UI AAA; depois eu evoluo o engine
     para gerar o calendário perfeito com base nas competições.
   =======================================================*/

(function () {
  console.log("%c[CalendarUI] calendar-ui.js carregado", "color:#34d399; font-weight:bold;");

  // -----------------------------
  // CSS AAA injetado
  // -----------------------------
  function injectCssOnce() {
    if (document.getElementById("vf-calendar-css")) return;
    const style = document.createElement("style");
    style.id = "vf-calendar-css";
    style.textContent = `
      .cal-wrap{max-width:1100px;margin:0 auto;padding:10px}
      .cal-top{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin:10px 0}
      .cal-card{background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:12px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
      .cal-title{font-weight:900;letter-spacing:.6px;text-transform:uppercase;font-size:13px;margin:0}
      .cal-sub{opacity:.75;font-size:12px;margin-top:4px}
      .cal-controls{display:flex;gap:10px;flex-wrap:wrap}
      .cal-controls select,.cal-controls input{
        padding:10px;border-radius:14px;border:1px solid rgba(255,255,255,.10);
        background:rgba(0,0,0,.35);color:#fff;font-weight:800;outline:none
      }
      .cal-btn{padding:10px 12px;border-radius:14px;border:1px solid rgba(255,255,255,.12);background:rgba(34,197,94,.18);color:#fff;font-weight:900;cursor:pointer}
      .cal-list{display:grid;grid-template-columns:1fr;gap:8px;margin-top:10px}
      .cal-day{display:flex;flex-direction:column;gap:8px}
      .cal-dayhead{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .cal-date{font-weight:900}
      .cal-badges{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}
      .badge{padding:6px 10px;border-radius:999px;font-weight:900;font-size:11px;letter-spacing:.3px;border:1px solid rgba(255,255,255,.10);background:rgba(255,255,255,.06)}
      .badge-league{color:#60a5fa}
      .badge-cup{color:#fbbf24}
      .badge-reg{color:#a78bfa}
      .badge-friendly{color:#86efac}
      .evt{display:flex;align-items:center;justify-content:space-between;gap:10px}
      .evt-left{display:flex;align-items:center;gap:10px;min-width:0}
      .evt-logos{display:flex;align-items:center;gap:6px}
      .evt-logos img{width:26px;height:26px;border-radius:8px;object-fit:cover;border:1px solid rgba(255,255,255,.10)}
      .evt-name{font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .evt-meta{opacity:.75;font-size:12px;white-space:nowrap}
      .cal-muted{opacity:.75;font-size:12px}
    `;
    document.head.appendChild(style);
  }

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function el(tag, cls, txt) { const d = document.createElement(tag); if (cls) d.className = cls; if (txt != null) d.textContent = txt; return d; }
  function clear(node) { if (!node) return; while (node.firstChild) node.removeChild(node.firstChild); }
  function pad2(x) { return String(x).padStart(2, "0"); }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.seasonYear) gs.seasonYear = 2026;
    if (!gs.seasonMonthStart) gs.seasonMonthStart = 1; // Jan
    return gs;
  }

  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }

  function teamName(id) {
    const t = getTeams().find(x => String(x.id) === String(id));
    return t?.name || id;
  }

  function logoImg(teamId) {
    const img = document.createElement("img");
    img.src = `assets/logos/${teamId}.png`;
    img.onerror = () => { img.src = "assets/logos/default.png"; };
    return img;
  }

  function toISODate(y, m, d) {
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }

  // -----------------------------
  // Eventos: coleta do engine / fallback
  // Formato padrão do UI:
  // { date:"YYYY-MM-DD", comp:"LEAGUE|CUP|REGIONAL|FRIENDLY", title:"...", homeId, awayId, round }
  // -----------------------------
  function collectEvents() {
    const gs = ensureGS();
    const teamId = getUserTeamId();

    // 1) engine Calendar fornece?
    try {
      if (window.Calendar && typeof Calendar.getAnnualEvents === "function") {
        const arr = Calendar.getAnnualEvents(teamId);
        if (Array.isArray(arr) && arr.length) return normalizeEvents(arr);
      }
      if (window.Calendar && typeof Calendar.getEvents === "function") {
        const arr = Calendar.getEvents(teamId);
        if (Array.isArray(arr) && arr.length) return normalizeEvents(arr);
      }
    } catch (e) {}

    // 2) gameState.schedule existe?
    if (Array.isArray(gs.schedule) && gs.schedule.length) {
      return normalizeEvents(gs.schedule);
    }

    // 3) fallback: monta um “modelo” anual
    const year = n(gs.seasonYear, 2026);
    const events = [];

    // Série A/B: 38 rodadas (modelo)
    // Datas: domingos alternados (apenas para não ficar vazio)
    const leagueName = "Série";
    for (let r = 1; r <= 38; r++) {
      const month = clamp(4 + Math.floor((r - 1) / 6), 4, 12); // abril -> dezembro
      const day = clamp(2 + ((r - 1) * 2) % 26, 1, 28);
      events.push({
        date: toISODate(year, month, day),
        comp: "LEAGUE",
        title: `${leagueName} • Rodada ${r}`,
        homeId: teamId,
        awayId: "TBD",
        round: r
      });
    }

    // Copa do Brasil: 8 datas
    for (let i = 1; i <= 8; i++) {
      const month = i <= 2 ? 2 : (i <= 4 ? 5 : (i <= 6 ? 7 : 9));
      const day = clamp(5 + i * 2, 1, 28);
      events.push({
        date: toISODate(year, month, day),
        comp: "CUP",
        title: `Copa do Brasil • Fase ${i}`,
        homeId: teamId,
        awayId: "TBD",
        round: i
      });
    }

    // Estaduais: jan-mar
    for (let r = 1; r <= 12; r++) {
      const month = r <= 4 ? 1 : (r <= 8 ? 2 : 3);
      const day = clamp(3 + ((r - 1) * 2) % 26, 1, 28);
      events.push({
        date: toISODate(year, month, day),
        comp: "REGIONAL",
        title: `Estadual • Rodada ${r}`,
        homeId: teamId,
        awayId: "TBD",
        round: r
      });
    }

    // ordena
    events.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return events;
  }

  function normalizeEvents(arr) {
    const teamId = getUserTeamId();
    const out = [];

    for (const e of arr) {
      // tenta diversas chaves
      const date = e.date || e.data || e.day || e.isoDate || e.when;
      if (!date) continue;

      const compRaw = String(e.comp || e.type || e.competition || e.kind || "LEAGUE").toUpperCase();
      let comp = "LEAGUE";
      if (compRaw.includes("CUP") || compRaw.includes("COPA")) comp = "CUP";
      else if (compRaw.includes("REG") || compRaw.includes("ESTAD")) comp = "REGIONAL";
      else if (compRaw.includes("FRIEND") || compRaw.includes("AMIST")) comp = "FRIENDLY";

      const homeId = e.homeId || e.home || e.teamHome || e.casa || teamId;
      const awayId = e.awayId || e.away || e.teamAway || e.fora || "TBD";
      const round = e.round || e.roundNumber || e.rodada || e.stage || null;

      const title =
        e.title ||
        e.name ||
        e.label ||
        (comp === "LEAGUE" ? `Liga${round ? " • Rodada " + round : ""}` :
         comp === "CUP" ? `Copa${round ? " • Fase " + round : ""}` :
         comp === "REGIONAL" ? `Estadual${round ? " • Rodada " + round : ""}` : "Amistoso");

      out.push({
        date: String(date).slice(0, 10),
        comp,
        title,
        homeId,
        awayId,
        round
      });
    }

    out.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    return out;
  }

  // -----------------------------
  // Render
  // -----------------------------
  function renderCalendar() {
    injectCssOnce();

    const node = document.getElementById("calendario-anual");
    clear(node);

    const gs = ensureGS();
    const teamId = getUserTeamId();

    const wrap = el("div", "cal-wrap");
    node.appendChild(wrap);

    const top = el("div", "cal-top");
    wrap.appendChild(top);

    const cardTitle = el("div", "cal-card");
    const title = el("div", "cal-title", "CALENDÁRIO ANUAL");
    const sub = el("div", "cal-sub", teamId ? `Time: ${teamName(teamId)} • Temporada ${gs.seasonYear}` : "Selecione um time.");
    cardTitle.appendChild(title);
    cardTitle.appendChild(sub);
    top.appendChild(cardTitle);

    const controls = el("div", "cal-card");
    const cTitle = el("div", "cal-title", "FILTRO");
    controls.appendChild(cTitle);

    const row = el("div", "cal-controls");

    const compSel = document.createElement("select");
    ["TODOS", "LEAGUE", "CUP", "REGIONAL", "FRIENDLY"].forEach(v => {
      const o = document.createElement("option");
      o.value = v; o.textContent = v;
      compSel.appendChild(o);
    });

    const monthSel = document.createElement("select");
    const months = [
      "TODOS","01","02","03","04","05","06","07","08","09","10","11","12"
    ];
    months.forEach(v => {
      const o = document.createElement("option");
      o.value = v; o.textContent = (v === "TODOS" ? "TODOS MESES" : `MÊS ${v}`);
      monthSel.appendChild(o);
    });

    const search = document.createElement("input");
    search.placeholder = "Buscar (ex: Rodada 10, Copa, Estadual…)";

    const btn = document.createElement("button");
    btn.className = "cal-btn";
    btn.textContent = "APLICAR";
    btn.onclick = () => draw();

    row.appendChild(compSel);
    row.appendChild(monthSel);
    row.appendChild(search);
    row.appendChild(btn);
    controls.appendChild(row);
    top.appendChild(controls);

    const list = el("div", "cal-list");
    wrap.appendChild(list);

    const events = collectEvents();

    function compBadge(comp) {
      const b = el("span", "badge", comp);
      if (comp === "LEAGUE") b.classList.add("badge-league");
      else if (comp === "CUP") b.classList.add("badge-cup");
      else if (comp === "REGIONAL") b.classList.add("badge-reg");
      else b.classList.add("badge-friendly");
      return b;
    }

    function draw() {
      clear(list);

      const compFilter = String(compSel.value || "TODOS").toUpperCase();
      const monthFilter = String(monthSel.value || "TODOS");
      const q = String(search.value || "").trim().toLowerCase();

      const filtered = events.filter(e => {
        if (compFilter !== "TODOS" && String(e.comp) !== compFilter) return false;
        if (monthFilter !== "TODOS") {
          const m = String(e.date).slice(5, 7);
          if (m !== monthFilter) return false;
        }
        if (q) {
          const txt = `${e.title} ${teamName(e.homeId)} ${teamName(e.awayId)}`.toLowerCase();
          if (!txt.includes(q)) return false;
        }
        return true;
      });

      if (!filtered.length) {
        list.appendChild(el("div", "cal-card cal-muted", "Nenhum evento encontrado para esse filtro."));
        return;
      }

      // agrupa por data
      const map = new Map();
      for (const e of filtered) {
        if (!map.has(e.date)) map.set(e.date, []);
        map.get(e.date).push(e);
      }

      const dates = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));

      for (const date of dates) {
        const dayCard = el("div", "cal-card cal-day");
        const head = el("div", "cal-dayhead");

        const left = el("div", "cal-date", date);
        const right = el("div", "cal-badges");

        // badges únicos do dia
        const comps = Array.from(new Set(map.get(date).map(x => x.comp)));
        comps.forEach(c => right.appendChild(compBadge(c)));

        head.appendChild(left);
        head.appendChild(right);
        dayCard.appendChild(head);

        // eventos do dia
        map.get(date).forEach(ev => {
          const evt = el("div", "evt");

          const evtLeft = el("div", "evt-left");
          const logos = el("div", "evt-logos");

          // pode ser "TBD" no fallback
          if (ev.homeId && ev.homeId !== "TBD") logos.appendChild(logoImg(ev.homeId));
          if (ev.awayId && ev.awayId !== "TBD") logos.appendChild(logoImg(ev.awayId));

          const nameBox = el("div", "");
          const name = el("div", "evt-name", ev.title || "Evento");
          const meta = el("div", "evt-meta", `${teamName(ev.homeId)} vs ${teamName(ev.awayId)}`);

          nameBox.appendChild(name);
          nameBox.appendChild(meta);

          evtLeft.appendChild(logos);
          evtLeft.appendChild(nameBox);

          evt.appendChild(evtLeft);

          dayCard.appendChild(evt);
        });

        list.appendChild(dayCard);
      }
    }

    draw();
  }

  window.CalendarUI = {
    renderCalendar
  };
})();