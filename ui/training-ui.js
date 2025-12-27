/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/training-ui.js — Tela de Treino AAA (Progressão)
   -------------------------------------------------------
   - UI completa com:
     • Plano do time (intensidade + foco)
     • Botão "Aplicar semana"
     • Relatório: top melhorias / pioras / lesões
   - Não quebra se Training não existir

   API:
   - TrainingUI.open()
   - TrainingUI.render()
   - TrainingUI.close()

   Integração:
   - Se existir botão #btn-treino, bind automático
   - Se não existir tela no HTML, cria overlay AAA
   =======================================================*/

(function () {
  console.log("%c[TrainingUI] training-ui.js carregado", "color:#a78bfa; font-weight:bold;");

  // -----------------------------
  // CSS AAA
  // -----------------------------
  function injectCssOnce() {
    if (document.getElementById("vf-training-css")) return;
    const s = document.createElement("style");
    s.id = "vf-training-css";
    s.textContent = `
      .vf-tr-overlay{
        position:fixed; inset:0; z-index:9998;
        background: radial-gradient(1200px 600px at 25% 10%, rgba(167,139,250,.20), transparent 52%),
                    radial-gradient(1200px 600px at 85% 0%, rgba(96,165,250,.16), transparent 60%),
                    rgba(0,0,0,.72);
        backdrop-filter: blur(8px);
        display:none;
      }
      .vf-tr-overlay.active{display:block}
      .vf-tr-shell{max-width:1100px;margin:18px auto;padding:14px}
      .vf-tr-top{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        padding:12px; border-radius:18px;
        background: rgba(0,0,0,.38);
        border:1px solid rgba(255,255,255,.10);
        box-shadow: 0 10px 30px rgba(0,0,0,.28);
      }
      .vf-tr-title h2{
        margin:0; font-weight:1000; letter-spacing:.6px; text-transform:uppercase; font-size:14px
      }
      .vf-tr-title .sub{opacity:.75; font-weight:900; font-size:12px}
      .vf-btn{
        border-radius:14px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        color: rgba(255,255,255,.92);
        font-weight:1000;
        padding:10px 12px;
        cursor:pointer;
      }
      .vf-btn.primary{background: rgba(167,139,250,.22)}
      .vf-btn.ok{background: rgba(34,197,94,.18)}
      .vf-grid{display:grid;grid-template-columns:1fr 1fr; gap:12px; margin-top:12px}
      @media(max-width:860px){.vf-grid{grid-template-columns:1fr}}

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
      .vf-pill.ok{color:#86efac}
      .vf-pill.warn{color:#fbbf24}
      .vf-pill.bad{color:#fb7185}
      .vf-muted{opacity:.75}

      .vf-form{display:grid; gap:10px}
      .vf-row{display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap}
      .vf-row label{font-weight:1000; opacity:.9; font-size:12px; letter-spacing:.4px; text-transform:uppercase}
      .vf-row select, .vf-row input{
        background: rgba(0,0,0,.35);
        color: rgba(255,255,255,.94);
        border:1px solid rgba(255,255,255,.10);
        border-radius:14px;
        padding:10px 12px;
        font-weight:1000;
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
      .vf-item .r{display:flex; align-items:center; gap:10px; font-weight:1000}
      .vf-kpi{min-width:74px; text-align:right}
    `;
    document.head.appendChild(s);
  }

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = String(txt);
    return e;
  }
  function clear(node) { if (!node) return; node.innerHTML = ""; }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.seasonYear) gs.seasonYear = 2026;
    return gs;
  }
  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  // -----------------------------
  // Overlay
  // -----------------------------
  let overlay = null;
  function ensureOverlay() {
    injectCssOnce();
    if (overlay) return;

    overlay = el("div", "vf-tr-overlay");
    overlay.id = "vf-training-overlay";

    const shell = el("div", "vf-tr-shell");
    overlay.appendChild(shell);

    const top = el("div", "vf-tr-top");
    const title = el("div", "vf-tr-title");
    const h2 = el("h2", "", "Treinamento");
    const sub = el("div", "sub", "Plano semanal • Evolução • Moral e Forma");
    title.appendChild(h2);
    title.appendChild(sub);

    const actions = el("div", "");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.flexWrap = "wrap";

    const btnApply = el("button", "vf-btn ok", "Aplicar Semana");
    btnApply.id = "vf-tr-apply";

    const btnClose = el("button", "vf-btn", "Fechar");
    btnClose.onclick = () => TrainingUI.close();

    actions.appendChild(btnApply);
    actions.appendChild(btnClose);

    top.appendChild(title);
    top.appendChild(actions);

    const grid = el("div", "vf-grid");

    const cardPlan = el("div", "vf-card");
    cardPlan.innerHTML = `<div class="hd"><div class="t">Plano do time</div><div id="vf-tr-pill" class="vf-pill warn">—</div></div>`;
    const form = el("div", "vf-form");
    form.id = "vf-tr-form";
    cardPlan.appendChild(form);

    const cardReport = el("div", "vf-card");
    cardReport.innerHTML = `<div class="hd"><div class="t">Relatório</div><div id="vf-tr-week" class="vf-pill blue">—</div></div>`;
    const report = el("div", "");
    report.id = "vf-tr-report";
    cardReport.appendChild(report);

    grid.appendChild(cardPlan);
    grid.appendChild(cardReport);

    shell.appendChild(top);
    shell.appendChild(grid);

    document.body.appendChild(overlay);
  }

  function show() { if (overlay) overlay.classList.add("active"); }
  function hide() { if (overlay) overlay.classList.remove("active"); }

  // -----------------------------
  // Render
  // -----------------------------
  function renderPlan(teamId) {
    const form = document.getElementById("vf-tr-form");
    const pill = document.getElementById("vf-tr-pill");
    if (!form) return;

    clear(form);

    if (!window.Training) {
      form.appendChild(el("div", "vf-muted", "Training engine não carregado."));
      return;
    }

    try { if (typeof Training.ensure === "function") Training.ensure(); } catch (e) {}

    let plan = null;
    try { if (typeof Training.getTeamPlan === "function") plan = Training.getTeamPlan(teamId); } catch (e) {}
    if (!plan) plan = { intensity: 3, focus: "BALANCED" };

    const row1 = el("div", "vf-row");
    row1.appendChild(el("label", "", "Intensidade"));
    const selInt = document.createElement("select");
    selInt.id = "vf-tr-intensity";
    [1,2,3,4,5].forEach(i => {
      const opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = `Nível ${i}`;
      if (n(plan.intensity,3) === i) opt.selected = true;
      selInt.appendChild(opt);
    });
    row1.appendChild(selInt);

    const row2 = el("div", "vf-row");
    row2.appendChild(el("label", "", "Foco"));
    const selFocus = document.createElement("select");
    selFocus.id = "vf-tr-focus";
    const focuses = [
      ["BALANCED","Equilibrado"],
      ["FITNESS","Condicionamento"],
      ["ATTACK","Ataque"],
      ["DEFENSE","Defesa"],
      ["MENTAL","Mental"],
      ["YOUTH","Base/Jovens"]
    ];
    focuses.forEach(([v, label]) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = label;
      if (String(plan.focus).toUpperCase() === v) opt.selected = true;
      selFocus.appendChild(opt);
    });
    row2.appendChild(selFocus);

    form.appendChild(row1);
    form.appendChild(row2);

    // pill status
    const intVal = n(plan.intensity, 3);
    if (pill) {
      pill.className = "vf-pill " + (intVal <= 2 ? "ok" : intVal === 3 ? "warn" : "bad");
      pill.textContent = `Int ${intVal} • ${String(plan.focus || "BALANCED").toUpperCase()}`;
    }

    // bind changes
    const applyPlan = () => {
      const newPlan = {
        intensity: n(document.getElementById("vf-tr-intensity")?.value, 3),
        focus: String(document.getElementById("vf-tr-focus")?.value || "BALANCED").toUpperCase()
      };
      try { if (Training && typeof Training.setTeamPlan === "function") Training.setTeamPlan(teamId, newPlan); } catch (e) {}
      render(); // re-render para atualizar pill
    };

    selInt.onchange = applyPlan;
    selFocus.onchange = applyPlan;
  }

  function renderReport(teamId) {
    const box = document.getElementById("vf-tr-report");
    const weekPill = document.getElementById("vf-tr-week");
    if (!box) return;

    clear(box);

    if (!window.Training) {
      box.appendChild(el("div", "vf-muted", "Training engine não carregado."));
      return;
    }

    let rep = null;
    try { if (Training && typeof Training.getWeeklyReport === "function") rep = Training.getWeeklyReport(teamId); } catch (e) {}

    if (weekPill) {
      const wk = window.gameState?.training?.week || 1;
      weekPill.className = "vf-pill blue";
      weekPill.textContent = `Semana ${wk}`;
    }

    if (!rep) {
      box.appendChild(el("div", "vf-note vf-muted", "Aplique uma semana para gerar relatório."));
      return;
    }

    box.appendChild(el("div", "vf-note", rep.summary || "Relatório"));

    const changes = Array.isArray(rep.changes) ? rep.changes.slice() : [];

    // Top melhorias
    const up = changes.filter(x => n(x.diff,0) > 0).sort((a,b)=>n(b.diff,0)-n(a.diff,0)).slice(0, 8);
    const down = changes.filter(x => n(x.diff,0) < 0).sort((a,b)=>n(a.diff,0)-n(b.diff,0)).slice(0, 6);
    const inj = changes.filter(x => n(x.injuryWeeks,0) > 0).sort((a,b)=>n(b.injuryWeeks,0)-n(a.injuryWeeks,0)).slice(0, 6);

    function section(title, arr, kind) {
      const card = el("div", "");
      card.style.marginTop = "10px";
      card.appendChild(el("div", "vf-muted", title));

      const list = el("div", "vf-list");
      if (!arr.length) {
        list.appendChild(el("div", "vf-muted", "—"));
      } else {
        arr.forEach(p => {
          const item = el("div", "vf-item");
          const l = el("div", "l");
          l.appendChild(el("div", "name", p.name || `Jogador ${p.playerId}`));
          const sub = el("div", "sub", `OVR ${n(p.ovrBefore,0)} → ${n(p.ovrAfter,0)} • Moral ${p.morale} • Forma ${p.form}`);
          l.appendChild(sub);

          const r = el("div", "r");

          if (kind === "UP") {
            r.appendChild(el("div", "vf-pill ok", `+${n(p.diff,0).toFixed(2)}`));
          } else if (kind === "DOWN") {
            r.appendChild(el("div", "vf-pill bad", `${n(p.diff,0).toFixed(2)}`));
          } else {
            r.appendChild(el("div", "vf-pill warn", `${n(p.injuryWeeks,0)} sem`));
          }

          r.appendChild(el("div", "vf-kpi", `Fad ${n(p.fatigue,0)}`));

          item.appendChild(l);
          item.appendChild(r);
          list.appendChild(item);
        });
      }

      card.appendChild(list);
      return card;
    }

    box.appendChild(section("Melhorias (Top)", up, "UP"));
    box.appendChild(section("Quedas (Top)", down, "DOWN"));
    box.appendChild(section("Lesões do treino", inj, "INJ"));
  }

  function render() {
    ensureOverlay();
    const teamId = getUserTeamId();
    if (!teamId) return;

    renderPlan(teamId);
    renderReport(teamId);

    // bind do botão aplicar semana
    const btn = document.getElementById("vf-tr-apply");
    if (btn && !btn.__vfBound) {
      btn.__vfBound = true;
      btn.onclick = () => {
        try {
          if (!window.Training || typeof Training.applyWeek !== "function") {
            alert("Training engine não encontrado.");
            return;
          }
          const rep = Training.applyWeek(teamId);
          if (rep && rep.ok) render();
        } catch (e) {
          console.warn("[TrainingUI] erro applyWeek:", e);
          alert("Erro ao aplicar semana.");
        }
      };
    }
  }

  // -----------------------------
  // Open/Close + Auto bind
  // -----------------------------
  function open() {
    ensureOverlay();
    render();
    show();
  }

  function close() {
    hide();
  }

  function bindAuto() {
    const btn = document.getElementById("btn-treino");
    if (btn && !btn.__vfBound) {
      btn.__vfBound = true;
      btn.addEventListener("click", () => open());
    }
    document.querySelectorAll("[data-action='treino']").forEach(b => {
      if (b.__vfBound) return;
      b.__vfBound = true;
      b.addEventListener("click", () => open());
    });
  }

  setInterval(bindAuto, 800);

  window.TrainingUI = { open, render, close };
})();