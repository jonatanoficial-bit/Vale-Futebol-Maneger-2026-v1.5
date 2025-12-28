/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/debug-panel-ui.js — Diagnóstico automático (TESTE)
   -------------------------------------------------------
   - Painel overlay mostrando o que carregou e o que faltou
   - Ajuda a localizar erros de script/ordem/cache (Vercel)
   - NÃO altera gameplay, só diagnostica
   =======================================================*/

(function () {
  console.log("%c[DEBUG PANEL] debug-panel-ui.js carregado", "color:#fbbf24; font-weight:bold;");

  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = String(txt);
    return e;
  }

  function injectCssOnce() {
    if (document.getElementById("vf-debug-css")) return;
    const s = document.createElement("style");
    s.id = "vf-debug-css";
    s.textContent = `
      .vfdbg-overlay{
        position:fixed; inset:0; z-index:10000;
        background: rgba(0,0,0,.82);
        backdrop-filter: blur(10px);
        display:none;
      }
      .vfdbg-overlay.active{display:block;}
      .vfdbg-shell{max-width:900px;margin:14px auto;padding:14px;}
      .vfdbg-card{
        border-radius:18px;
        background: rgba(0,0,0,.40);
        border:1px solid rgba(255,255,255,.10);
        box-shadow:0 16px 40px rgba(0,0,0,.40);
        overflow:hidden;
      }
      .vfdbg-top{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        padding:12px;
        border-bottom:1px solid rgba(255,255,255,.08);
        background: rgba(0,0,0,.30);
      }
      .vfdbg-title{
        display:flex; flex-direction:column; gap:2px; min-width:0;
      }
      .vfdbg-title .t{
        font-weight:1000; letter-spacing:.7px; text-transform:uppercase; font-size:12px;
      }
      .vfdbg-title .s{opacity:.75; font-weight:900; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
      .vfdbg-btn{
        border-radius:14px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        color: rgba(255,255,255,.92);
        font-weight:1000;
        padding:10px 12px;
        cursor:pointer;
      }
      .vfdbg-body{padding:12px; display:grid; gap:10px;}
      .vfdbg-row{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        padding:10px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.05);
      }
      .vfdbg-k{font-weight:1000; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
      .vfdbg-v{font-weight:1000;}
      .vfdbg-pill{
        display:inline-flex; align-items:center; gap:8px;
        padding:6px 10px; border-radius:999px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(0,0,0,.20);
        font-weight:1000; font-size:11px;
      }
      .vfdbg-ok{color:#86efac;}
      .vfdbg-bad{color:#fb7185;}
      .vfdbg-warn{color:#fbbf24;}
      .vfdbg-muted{opacity:.75;}
      .vfdbg-box{
        margin-top:10px;
        padding:10px;
        border-radius:14px;
        border:1px solid rgba(255,255,255,.08);
        background: rgba(0,0,0,.25);
        font-weight:900;
        font-size:12px;
        line-height:1.35;
      }
      .vfdbg-code{
        margin-top:8px;
        white-space:pre-wrap;
        word-break:break-word;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size:11px;
        opacity:.9;
      }
    `;
    document.head.appendChild(s);
  }

  function exists(pathArr) {
    let cur = window;
    for (const k of pathArr) {
      if (cur == null) return false;
      cur = cur[k];
    }
    return cur != null;
  }

  function isFn(pathArr) {
    let cur = window;
    for (const k of pathArr) {
      if (cur == null) return false;
      cur = cur[k];
    }
    return typeof cur === "function";
  }

  function getCapaStatus() {
    const img = document.querySelector("img.capa");
    if (!img) return { ok: false, reason: "Sem <img class='capa'> no DOM" };
    // complete+naturalWidth é o sinal real no browser
    const ok = !!(img.complete && img.naturalWidth > 0);
    return ok ? { ok: true, reason: "Imagem carregada" } : { ok: false, reason: "Imagem NÃO carregou (caminho/arquivo/cache)" };
  }

  let overlay = null;

  function ensureOverlay() {
    injectCssOnce();
    if (overlay) return;

    overlay = el("div", "vfdbg-overlay");
    overlay.id = "vf-debug-overlay";

    const shell = el("div", "vfdbg-shell");
    const card = el("div", "vfdbg-card");

    const top = el("div", "vfdbg-top");
    const title = el("div", "vfdbg-title");
    title.appendChild(el("div", "t", "Diagnóstico do Projeto"));
    title.appendChild(el("div", "s", "Mostra exatamente o que carregou e o que está faltando"));

    const actions = el("div", "");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.flexWrap = "wrap";

    const btnCopy = el("button", "vfdbg-btn", "Copiar relatório");
    btnCopy.onclick = () => {
      const data = buildReport();
      const text = JSON.stringify(data, null, 2);
      try {
        navigator.clipboard.writeText(text);
        alert("Relatório copiado! Cole aqui no chat se quiser.");
      } catch (e) {
        alert("Não consegui copiar automaticamente. Veja o relatório no painel.");
      }
    };

    const btnClose = el("button", "vfdbg-btn", "Fechar");
    btnClose.onclick = () => close();

    actions.appendChild(btnCopy);
    actions.appendChild(btnClose);

    top.appendChild(title);
    top.appendChild(actions);

    const body = el("div", "vfdbg-body");
    body.id = "vfdbg-body";

    card.appendChild(top);
    card.appendChild(body);

    shell.appendChild(card);
    overlay.appendChild(shell);
    document.body.appendChild(overlay);
  }

  function pill(ok, labelOk = "OK", labelBad = "FALHOU") {
    const p = el("div", "vfdbg-pill " + (ok ? "vfdbg-ok" : "vfdbg-bad"), ok ? labelOk : labelBad);
    return p;
  }

  function row(key, ok, extra) {
    const r = el("div", "vfdbg-row");
    const k = el("div", "vfdbg-k", key);
    const right = el("div", "");
    right.style.display = "flex";
    right.style.alignItems = "center";
    right.style.gap = "8px";

    right.appendChild(pill(ok));
    if (extra) right.appendChild(el("div", "vfdbg-v vfdbg-muted", extra));

    r.appendChild(k);
    r.appendChild(right);
    return r;
  }

  function buildReport() {
    const capa = getCapaStatus();

    const rep = {
      time: new Date().toISOString(),
      location: (typeof location !== "undefined" ? location.href : ""),
      capa: capa,
      checks: {
        Database: exists(["Database"]),
        DatabaseTeams: !!(window.Database && Array.isArray(Database.teams) && Database.teams.length > 0),
        DatabasePlayers: !!(window.Database && Array.isArray(Database.players) && Database.players.length > 0),

        SaveSalvar: isFn(["Save", "salvar"]) || (typeof window.salvarJogo === "function"),

        TeamUiExists: exists(["TeamUi"]),
        TeamUiRender: isFn(["TeamUi", "renderTeamSelection"]),
        TeamUIExists: exists(["TeamUI"]),
        TeamUIRender: isFn(["TeamUI", "renderTeamSelection"]),

        iniciarCarreiraFn: (typeof window.iniciarCarreira === "function"),
        carregarCarreiraFn: (typeof window.carregarCarreira === "function"),

        MatchEngine: exists(["Match"]) && isFn(["Match", "iniciarProximoJogo"]),
        PostMatch: exists(["PostMatch"]) && isFn(["PostMatch", "processMatch"]),
        PostMatchUI: exists(["PostMatchUI"]) && isFn(["PostMatchUI", "open"]),
        SeasonCalendar: exists(["SeasonCalendar"]) && isFn(["SeasonCalendar", "ensure"]),
        SeasonCalendarUI: exists(["SeasonCalendarUI"]) && isFn(["SeasonCalendarUI", "open"]),
        LobbyHub: exists(["LobbyHubUI"]) && isFn(["LobbyHubUI", "render"])
      }
    };

    // contagens
    rep.counts = {
      teams: window.Database?.teams?.length || 0,
      players: window.Database?.players?.length || 0
    };

    return rep;
  }

  function render() {
    ensureOverlay();
    const body = document.getElementById("vfdbg-body");
    if (!body) return;
    body.innerHTML = "";

    const rep = buildReport();

    // Capa
    body.appendChild(row("Capa (imagem)", rep.capa.ok, rep.capa.reason));

    // Database
    body.appendChild(row("Database carregado", rep.checks.Database));
    body.appendChild(row("Database.teams (existe e tem times)", rep.checks.DatabaseTeams, `Times: ${rep.counts.teams}`));
    body.appendChild(row("Database.players (existe e tem jogadores)", rep.checks.DatabasePlayers, `Jogadores: ${rep.counts.players}`));

    // Funções de carreira
    body.appendChild(row("Função iniciarCarreira()", rep.checks.iniciarCarreiraFn));
    body.appendChild(row("Função carregarCarreira()", rep.checks.carregarCarreiraFn));

    // Team selection
    body.appendChild(row("TeamUi existe", rep.checks.TeamUiExists));
    body.appendChild(row("TeamUi.renderTeamSelection()", rep.checks.TeamUiRender));
    body.appendChild(row("TeamUI existe (compat)", rep.checks.TeamUIExists));
    body.appendChild(row("TeamUI.renderTeamSelection()", rep.checks.TeamUIRender));

    // Engines
    body.appendChild(row("Match.iniciarProximoJogo()", rep.checks.MatchEngine));
    body.appendChild(row("PostMatch.processMatch()", rep.checks.PostMatch));
    body.appendChild(row("PostMatchUI.open()", rep.checks.PostMatchUI));
    body.appendChild(row("SeasonCalendar.ensure()", rep.checks.SeasonCalendar));
    body.appendChild(row("SeasonCalendarUI.open()", rep.checks.SeasonCalendarUI));
    body.appendChild(row("LobbyHubUI.render()", rep.checks.LobbyHub));

    // Dica automática
    const hint = el("div", "vfdbg-box");
    let msg = "Diagnóstico automático:\n";

    if (!rep.capa.ok) {
      msg += "• A CAPA não carregou. Verifique o caminho do arquivo (no projeto original é assets/geral/capa.png).\n";
    }
    if (!rep.checks.DatabaseTeams) {
      msg += "• Database.teams está vazio. Isso costuma ser erro de carregamento do engine/database.js.\n";
    }
    if (!rep.checks.TeamUiRender && !rep.checks.TeamUIRender) {
      msg += "• TeamUi.renderTeamSelection NÃO existe — isso causa o erro do botão iniciar.\n";
    }
    if (!rep.checks.iniciarCarreiraFn) {
      msg += "• iniciarCarreira() não existe — o onclick do botão pode estar chamando algo que não foi definido.\n";
    }

    if (msg.trim() === "Diagnóstico automático:") msg += "• Tudo parece carregado corretamente.\n";
    hint.textContent = msg;

    const code = el("div", "vfdbg-code");
    code.textContent = JSON.stringify(rep, null, 2);

    body.appendChild(hint);
    body.appendChild(code);
  }

  function open() {
    ensureOverlay();
    render();
    overlay.classList.add("active");
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("active");
  }

  // Bind do botão DEBUG
  function bind() {
    const btn = document.getElementById("vf-debug-open");
    if (btn && !btn.__vfBound) {
      btn.__vfBound = true;
      btn.addEventListener("click", open);
    }
  }
  setInterval(bind, 500);

  window.DebugPanelUI = { open, close, render };
})();