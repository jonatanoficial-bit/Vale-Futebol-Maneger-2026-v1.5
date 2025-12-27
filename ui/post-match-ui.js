/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/post-match-ui.js — Tela Pós-jogo AAA (SM26-like)
   -------------------------------------------------------
   - Overlay bonito, mobile-friendly
   - Mostra:
     • placar
     • gols (scorers)
     • MOTM
     • top ratings (time do usuário + adversário)
     • lesões (se houver)
   - Botão "Continuar" volta ao lobby (ou UI.voltarLobby)

   API:
   - PostMatchUI.open(report)
   - PostMatchUI.close()
   =======================================================*/

(function () {
  console.log("%c[PostMatchUI] post-match-ui.js carregado", "color:#fb7185; font-weight:bold;");

  function injectCssOnce() {
    if (document.getElementById("vf-postmatch-css")) return;
    const s = document.createElement("style");
    s.id = "vf-postmatch-css";
    s.textContent = `
      .vf-pm-overlay{
        position:fixed; inset:0; z-index:9995;
        background: radial-gradient(1200px 600px at 20% 10%, rgba(251,113,133,.18), transparent 52%),
                    radial-gradient(1200px 600px at 85% 0%, rgba(167,139,250,.16), transparent 60%),
                    rgba(0,0,0,.76);
        backdrop-filter: blur(9px);
        display:none;
      }
      .vf-pm-overlay.active{display:block}
      .vf-pm-shell{max-width:1100px;margin:18px auto;padding:14px}
      .vf-pm-top{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        padding:12px; border-radius:18px;
        background: rgba(0,0,0,.38);
        border:1px solid rgba(255,255,255,.10);
        box-shadow: 0 10px 30px rgba(0,0,0,.28);
      }
      .vf-pm-title h2{margin:0;font-weight:1000;letter-spacing:.6px;text-transform:uppercase;font-size:14px}
      .vf-pm-title .sub{opacity:.75;font-weight:900;font-size:12px}

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
      .vf-btn.alt{background: rgba(96,165,250,.16)}

      .vf-grid{display:grid;grid-template-columns:1fr 1fr; gap:12px; margin-top:12px}
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

      .vf-score{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        padding:10px 12px;
        border-radius:18px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(0,0,0,.28);
      }
      .vf-team{
        display:flex; flex-direction:column; gap:2px; min-width:0;
      }
      .vf-team .name{font-weight:1000; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
      .vf-team .sub{opacity:.75; font-weight:900; font-size:12px}
      .vf-score .mid{
        display:flex; align-items:center; gap:10px;
        font-weight:1000;
      }
      .vf-score .num{
        font-size:28px;
        letter-spacing:1px;
      }

      .vf-pill{
        display:inline-flex; align-items:center; gap:8px;
        padding:6px 10px; border-radius:999px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        font-weight:1000; font-size:11px; letter-spacing:.2px;
      }
      .vf-pill.ok{color:#86efac}
      .vf-pill.warn{color:#fbbf24}
      .vf-pill.bad{color:#fb7185}
      .vf-pill.blue{color:#60a5fa}
      .vf-muted{opacity:.75}

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
      .vf-item .r{display:flex; align-items:center; gap:10px; font-weight:1000}
      .vf-divider{height:1px;background: rgba(255,255,255,.08); margin:10px 0}
    `;
    document.head.appendChild(s);
  }

  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = String(txt);
    return e;
  }
  function clear(node) { if (!node) return; node.innerHTML = ""; }
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }

  let overlay = null;
  let lastReport = null;

  function ensureOverlay() {
    injectCssOnce();
    if (overlay) return;

    overlay = el("div", "vf-pm-overlay");
    overlay.id = "vf-postmatch-overlay";

    const shell = el("div", "vf-pm-shell");
    overlay.appendChild(shell);

    const top = el("div", "vf-pm-top");
    const title = el("div", "vf-pm-title");
    title.appendChild(el("h2", "", "Relatório Pós-Jogo"));
    title.appendChild(el("div", "sub", "Notas • Melhor em Campo • Lesões • Destaques"));

    const actions = el("div", "");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.flexWrap = "wrap";

    const btnCont = el("button", "vf-btn primary", "Continuar");
    btnCont.onclick = () => {
      PostMatchUI.close();
      try {
        if (window.UI && typeof UI.voltarLobby === "function") UI.voltarLobby();
        else if (typeof mostrarTela === "function") mostrarTela("tela-lobby");
      } catch (e) {}
    };

    const btnClose = el("button", "vf-btn", "Fechar");
    btnClose.onclick = () => PostMatchUI.close();

    actions.appendChild(btnCont);
    actions.appendChild(btnClose);

    top.appendChild(title);
    top.appendChild(actions);

    const scoreWrap = el("div", "");
    scoreWrap.id = "vf-pm-scorewrap";
    scoreWrap.style.marginTop = "12px";

    const grid = el("div", "vf-grid");

    const left = el("div", "vf-card");
    left.id = "vf-pm-left";
    const right = el("div", "vf-card");
    right.id = "vf-pm-right";

    grid.appendChild(left);
    grid.appendChild(right);

    shell.appendChild(top);
    shell.appendChild(scoreWrap);
    shell.appendChild(grid);

    document.body.appendChild(overlay);
  }

  function show() { if (overlay) overlay.classList.add("active"); }
  function hide() { if (overlay) overlay.classList.remove("active"); }

  function renderScore(report) {
    const wrap = document.getElementById("vf-pm-scorewrap");
    if (!wrap) return;
    clear(wrap);

    const score = el("div", "vf-score");

    const home = el("div", "vf-team");
    home.appendChild(el("div", "name", report.homeName || "Casa"));
    const hs = el("div", "sub", `Gols: ${(report.scorersHome||[]).map(s=>s.name).slice(0,3).join(", ") || "—"}`);
    home.appendChild(hs);

    const mid = el("div", "mid");
    const num = el("div", "num", `${report.goalsHome}  x  ${report.goalsAway}`);
    mid.appendChild(num);

    const away = el("div", "vf-team");
    away.appendChild(el("div", "name", report.awayName || "Visitante"));
    const as = el("div", "sub", `Gols: ${(report.scorersAway||[]).map(s=>s.name).slice(0,3).join(", ") || "—"}`);
    away.appendChild(as);

    score.appendChild(home);
    score.appendChild(mid);
    score.appendChild(away);

    wrap.appendChild(score);

    const motm = report.motm;
    const pill = el("div", "vf-pill ok", `MOTM: ${motm?.name || "—"} (${n(motm?.rating,0).toFixed(1)})`);
    pill.style.marginTop = "10px";
    wrap.appendChild(pill);
  }

  function renderTeamRatings(card, titleText, ratings) {
    clear(card);

    const hd = el("div", "hd");
    hd.appendChild(el("div", "t", titleText));
    const pill = el("div", "vf-pill blue", `Top ${Math.min(8, ratings.length)}`);
    hd.appendChild(pill);
    card.appendChild(hd);

    const list = el("div", "vf-list");
    (ratings || []).slice(0, 8).forEach(r => {
      const item = el("div", "vf-item");

      const l = el("div", "l");
      l.appendChild(el("div", "name", `${r.name} (${r.pos})`));
      l.appendChild(el("div", "sub", `OVR ${r.ovr} • Gols ${r.goals || 0} • Min ${r.minutes || 90}`));

      const rr = el("div", "r");
      const rating = n(r.rating, 0);
      const pillCls = rating >= 7.6 ? "ok" : rating >= 6.7 ? "warn" : "bad";
      rr.appendChild(el("div", "vf-pill " + pillCls, rating.toFixed(1)));

      item.appendChild(l);
      item.appendChild(rr);
      list.appendChild(item);
    });

    card.appendChild(list);
  }

  function renderInjuries(card, injHome, injAway) {
    const wrap = el("div", "");
    wrap.style.marginTop = "10px";

    const title = el("div", "vf-divider");
    wrap.appendChild(title);

    const hd = el("div", "hd");
    hd.appendChild(el("div", "t", "Lesões"));
    wrap.appendChild(hd);

    const all = []
      .concat((injHome || []).map(x => Object.assign({ side: "Casa" }, x)))
      .concat((injAway || []).map(x => Object.assign({ side: "Fora" }, x)));

    const list = el("div", "vf-list");
    if (!all.length) {
      list.appendChild(el("div", "vf-muted", "Nenhuma lesão relevante registrada."));
    } else {
      all.slice(0, 10).forEach(x => {
        const item = el("div", "vf-item");
        const l = el("div", "l");
        l.appendChild(el("div", "name", `${x.name}`));
        l.appendChild(el("div", "sub", `${x.side} • ${x.weeks} semana(s)`));
        const r = el("div", "r");
        r.appendChild(el("div", "vf-pill bad", "LESÃO"));
        item.appendChild(l);
        item.appendChild(r);
        list.appendChild(item);
      });
    }

    wrap.appendChild(list);
    card.appendChild(wrap);
  }

  function render(report) {
    ensureOverlay();
    if (!overlay) return;
    if (!report) return;

    lastReport = report;

    renderScore(report);

    const left = document.getElementById("vf-pm-left");
    const right = document.getElementById("vf-pm-right");

    renderTeamRatings(left, `${report.homeName} — Notas`, report.ratingsHome || []);
    renderTeamRatings(right, `${report.awayName} — Notas`, report.ratingsAway || []);

    // Injuries no card esquerdo (compacto)
    renderInjuries(left, report.injuriesHome || [], report.injuriesAway || []);
  }

  window.PostMatchUI = {
    open(report) {
      ensureOverlay();
      render(report);
      show();
    },
    close() { hide(); },
    getLastReport() { return lastReport; }
  };
})();