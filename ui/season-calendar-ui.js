/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/season-calendar-ui.js — Calendário anual AAA (overlay)
   -------------------------------------------------------
   - Visual do ano (Jan–Dez) com barras por competição
   - Mostra próximos jogos do usuário (puxa do Calendar se existir)
   - Botão Avançar Semana (Training + Calendar, se disponível)
   - Mobile-friendly, padrão AAA

   Bind:
   - #btn-calendario ou [data-action="calendario"]

   API:
   - SeasonCalendarUI.open()
   - SeasonCalendarUI.close()
   =======================================================*/

(function () {
  console.log("%c[SeasonCalendarUI] season-calendar-ui.js carregado", "color:#60a5fa; font-weight:bold;");

  // -----------------------------
  // CSS
  // -----------------------------
  function injectCssOnce() {
    if (document.getElementById("vf-sc-css")) return;
    const s = document.createElement("style");
    s.id = "vf-sc-css";
    s.textContent = `
      .vf-sc-overlay{
        position:fixed; inset:0; z-index:9994;
        background: radial-gradient(1200px 600px at 20% 10%, rgba(96,165,250,.18), transparent 52%),
                    radial-gradient(1200px 600px at 85% 0%, rgba(34,197,94,.14), transparent 60%),
                    rgba(0,0,0,.76);
        backdrop-filter: blur(9px);
        display:none;
      }
      .vf-sc-overlay.active{display:block}
      .vf-sc-shell{max-width:1200px;margin:18px auto;padding:14px}

      .vf-sc-top{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        padding:12px; border-radius:18px;
        background: rgba(0,0,0,.38);
        border:1px solid rgba(255,255,255,.10);
        box-shadow: 0 10px 30px rgba(0,0,0,.28);
      }
      .vf-sc-title h2{margin:0;font-weight:1000;letter-spacing:.6px;text-transform:uppercase;font-size:14px}
      .vf-sc-title .sub{opacity:.75;font-weight:900;font-size:12px}

      .vf-btn{
        border-radius:14px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        color: rgba(255,255,255,.92);
        font-weight:1000;
        padding:10px 12px;
        cursor:pointer;
      }
      .vf-btn.primary{background: rgba(34,197,94,.18)}
      .vf-btn.blue{background: rgba(96,165,250,.18)}

      .vf-grid{display:grid;grid-template-columns:1.15fr .85fr; gap:12px; margin-top:12px}
      @media(max-width:980px){.vf-grid{grid-template-columns:1fr}}

      .vf-card{
        border-radius:18px;
        background: rgba(0,0,0,.35);
        border:1px solid rgba(255,255,255,.08);
        box-shadow: 0 10px 30px rgba(0,0,0,.25);
        padding:12px;
      }
      .vf-card .hd{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        margin-bottom:10px;
      }
      .vf-card .hd .t{
        font-weight:1000;
        letter-spacing:.6px;
        text-transform:uppercase;
        font-size:12px;
        opacity:.9;
      }

      .vf-pill{
        display:inline-flex; align-items:center; gap:8px;
        padding:6px 10px; border-radius:999px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        font-weight:1000; font-size:11px; letter-spacing:.2px;
      }
      .vf-pill.blue{color:#60a5fa}
      .vf-pill.ok{color:#86efac}
      .vf-pill.warn{color:#fbbf24}
      .vf-pill.bad{color:#fb7185}
      .vf-muted{opacity:.75}

      .vf-months{
        display:grid;
        grid-template-columns: repeat(12, 1fr);
        gap:6px;
        margin: 10px 0 12px;
      }
      .vf-month{
        text-align:center;
        font-weight:1000;
        font-size:11px;
        padding:8px 6px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(0,0,0,.20);
        opacity:.9;
      }

      .vf-bars{display:grid; gap:8px}
      .vf-bar{
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(0,0,0,.22);
        padding: 10px;
      }
      .vf-bar .row{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        margin-bottom:8px;
      }
      .vf-bar .name{
        font-weight:1000;
        letter-spacing:.3px;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }
      .vf-track{
        position: relative;
        height: 12px;
        border-radius: 999px;
        background: rgba(255,255,255,.06);
        border:1px solid rgba(255,255,255,.08);
        overflow:hidden;
      }
      .vf-fill{
        position:absolute;
        top:0; bottom:0;
        border-radius: 999px;
        opacity:.95;
      }

      .vf-list{display:grid; gap:6px}
      .vf-item{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        padding:8px 10px;
        border-radius:14px;
        background: rgba(255,255,255,.05);
        border:1px solid rgba(255,255,255,.07);
      }
      .vf-item .l{display:flex; flex-direction:column; gap:2px; min-width:0}
      .vf-item .l .name{font-weight:1000; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
      .vf-item .l .sub{opacity:.75; font-weight:900; font-size:12px}
      .vf-divider{height:1px;background: rgba(255,255,255,.08); margin:10px 0}
    `;
    document.head.appendChild(s);
  }

  // -----------------------------
  // Utils
  // -----------------------------
  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = String(txt);
    return e;
  }
  function clear(node) { if (!node) return; node.innerHTML = ""; }
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

  function colorForKey(key) {
    const k = String(key || "").toUpperCase();
    if (k === "GREEN") return "rgba(34,197,94,.55)";
    if (k === "AMBER") return "rgba(251,191,36,.55)";
    if (k === "PINK") return "rgba(251,113,133,.55)";
    if (k === "BLUE") return "rgba(96,165,250,.55)";
    if (k === "SLATE") return "rgba(148,163,184,.55)";
    return "rgba(255,255,255,.30)";
  }

  function parseISO(x) {
    const d = new Date(x);
    return isNaN(d.getTime()) ? null : d;
  }

  // -----------------------------
  // Overlay
  // -----------------------------
  let overlay = null;

  function ensureOverlay() {
    injectCssOnce();
    if (overlay) return;

    overlay = el("div", "vf-sc-overlay");
    overlay.id = "vf-seasoncalendar-overlay";

    const shell = el("div", "vf-sc-shell");
    overlay.appendChild(shell);

    const top = el("div", "vf-sc-top");
    const title = el("div", "vf-sc-title");
    title.appendChild(el("h2", "", "Calendário da Temporada"));
    title.appendChild(el("div", "sub", "Estaduais • Série A/B • Copa do Brasil • Janelas"));

    const actions = el("div", "");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.flexWrap = "wrap";

    const btnWeek = el("button", "vf-btn primary", "Avançar Semana");
    btnWeek.onclick = () => {
      try {
        if (!window.SeasonCalendar) return alert("SeasonCalendar engine não carregado.");
        const res = SeasonCalendar.advanceWeek();
        render();
        alert(`Semana avançada.\nData: ${new Date(res.newDateISO).toLocaleDateString()}`);
      } catch (e) {
        console.warn(e);
        alert("Falha ao avançar semana.");
      }
    };

    const btnClose = el("button", "vf-btn", "Fechar");
    btnClose.onclick = () => SeasonCalendarUI.close();

    actions.appendChild(btnWeek);
    actions.appendChild(btnClose);

    top.appendChild(title);
    top.appendChild(actions);

    const grid = el("div", "vf-grid");

    const left = el("div", "vf-card");
    left.id = "vf-sc-left";

    const right = el("div", "vf-card");
    right.id = "vf-sc-right";

    grid.appendChild(left);
    grid.appendChild(right);

    shell.appendChild(top);
    shell.appendChild(grid);

    document.body.appendChild(overlay);
  }

  function show() { if (overlay) overlay.classList.add("active"); }
  function hide() { if (overlay) overlay.classList.remove("active"); }

  // -----------------------------
  // Render
  // -----------------------------
  function renderMacro(left) {
    clear(left);

    left.appendChild(el("div", "hd", ""));
    left.querySelector(".hd").appendChild(el("div", "t", "Visão do Ano"));
    left.querySelector(".hd").appendChild(el("div", "vf-pill blue", "Macro calendário"));

    // meses
    const months = el("div", "vf-months");
    MONTHS.forEach(m => months.appendChild(el("div", "vf-month", m)));
    left.appendChild(months);

    const bars = el("div", "vf-bars");

    const events = (window.SeasonCalendar ? SeasonCalendar.getMacroEvents() : []);
    if (!events.length) {
      bars.appendChild(el("div", "vf-muted", "Sem eventos macro."));
      left.appendChild(bars);
      return;
    }

    const year = n(window.gameState?.seasonCalendar?.year, new Date().getFullYear());
    const yearStart = new Date(year, 0, 1).getTime();
    const yearEnd = new Date(year, 11, 31).getTime();
    const yearSpan = Math.max(1, yearEnd - yearStart);

    events.forEach(ev => {
      const start = parseISO(ev.startISO) || new Date(year, 0, 1);
      const end = parseISO(ev.endISO) || new Date(year, 11, 31);

      const startPct = clamp(((start.getTime() - yearStart) / yearSpan) * 100, 0, 100);
      const endPct = clamp(((end.getTime() - yearStart) / yearSpan) * 100, 0, 100);
      const widthPct = clamp(endPct - startPct, 1, 100);

      const bar = el("div", "vf-bar");
      const row = el("div", "row");
      const name = el("div", "name", ev.short || ev.name || "Evento");
      const pill = el("div", "vf-pill", `${new Date(ev.startISO).toLocaleDateString()} → ${new Date(ev.endISO).toLocaleDateString()}`);
      pill.classList.add("blue");

      row.appendChild(name);
      row.appendChild(pill);

      const track = el("div", "vf-track");
      const fill = el("div", "vf-fill");
      fill.style.left = `${startPct}%`;
      fill.style.width = `${widthPct}%`;
      fill.style.background = colorForKey(ev.colorKey);

      track.appendChild(fill);

      bar.appendChild(row);
      bar.appendChild(track);
      bars.appendChild(bar);
    });

    left.appendChild(bars);

    left.appendChild(el("div", "vf-divider"));

    const note = el("div", "vf-muted");
    note.textContent = "Dica: Esse é o “macro” do ano. Os jogos reais aparecem à direita (se o Calendar do jogo tiver agenda).";
    left.appendChild(note);
  }

  function renderNextMatches(right) {
    clear(right);

    right.appendChild(el("div", "hd", ""));
    right.querySelector(".hd").appendChild(el("div", "t", "Próximos Jogos"));
    right.querySelector(".hd").appendChild(el("div", "vf-pill ok", "Matchday"));

    const list = el("div", "vf-list");

    let matches = [];
    try {
      if (window.SeasonCalendar) matches = SeasonCalendar.getNextMatches(10);
    } catch (e) {}

    if (!matches.length) {
      list.appendChild(el("div", "vf-muted", "Nenhum jogo listado (o Calendar pode ainda não expor agenda completa)."));
      right.appendChild(list);
      right.appendChild(el("div", "vf-divider"));
      right.appendChild(el("div", "vf-muted", "Mesmo assim, o macro calendário funciona e o jogo continua normal."));
      return;
    }

    function teamName(id) {
      try {
        const t = window.Database?.teams?.find(x => String(x.id) === String(id));
        return t?.name || String(id);
      } catch (e) { return String(id); }
    }

    matches.forEach(m => {
      const item = el("div", "vf-item");
      const l = el("div", "l");
      l.appendChild(el("div", "name", `${teamName(m.homeId)} x ${teamName(m.awayId)}`));

      const dateTxt = m.dateISO ? new Date(m.dateISO).toLocaleDateString() : "Data a definir";
      const sub = el("div", "sub", `${m.comp || "Competição"} ${m.round ? "• " + m.round : ""} • ${dateTxt}`);
      l.appendChild(sub);

      item.appendChild(l);
      item.appendChild(el("div", "vf-pill blue", "Agendado"));
      list.appendChild(item);
    });

    right.appendChild(list);

    right.appendChild(el("div", "vf-divider"));
    const hint = el("div", "vf-muted");
    hint.textContent = "Avance semanas para evoluir treino/forma e receber propostas no mercado.";
    right.appendChild(hint);
  }

  function render() {
    ensureOverlay();
    if (!overlay) return;

    if (!window.SeasonCalendar) {
      alert("SeasonCalendar engine não carregado. Verifique se engine/season-calendar.js está sendo importado.");
      return;
    }

    try { SeasonCalendar.ensure(); } catch (e) {}

    const left = document.getElementById("vf-sc-left");
    const right = document.getElementById("vf-sc-right");
    if (!left || !right) return;

    renderMacro(left);
    renderNextMatches(right);
  }

  // -----------------------------
  // Bind automático
  // -----------------------------
  function bindAuto() {
    const btn = document.getElementById("btn-calendario");
    if (btn && !btn.__vfBound) {
      btn.__vfBound = true;
      btn.addEventListener("click", () => SeasonCalendarUI.open());
    }

    document.querySelectorAll("[data-action='calendario']").forEach(b => {
      if (b.__vfBound) return;
      b.__vfBound = true;
      b.addEventListener("click", () => SeasonCalendarUI.open());
    });
  }
  setInterval(bindAuto, 800);

  // -----------------------------
  // Public
  // -----------------------------
  window.SeasonCalendarUI = {
    open() {
      ensureOverlay();
      render();
      show();
    },
    close() { hide(); },
    render
  };
})();