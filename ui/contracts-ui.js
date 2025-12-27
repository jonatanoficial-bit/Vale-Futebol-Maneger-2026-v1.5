/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/contracts-ui.js — Contratos AAA (FM-like)
   -------------------------------------------------------
   - Overlay completo:
     • resumo FFP (folha vs teto)
     • lista elenco com busca e ordenação
     • ações: renovar, rescindir, liberar
   - Integra com engine/contracts.js
   - Não quebra se engine não existir

   API:
   - ContractsUI.open()
   - ContractsUI.render()
   - ContractsUI.close()

   Integração:
   - bind automático se existir botão #btn-contratos ou data-action="contratos"
   =======================================================*/

(function () {
  console.log("%c[ContractsUI] contracts-ui.js carregado", "color:#60a5fa; font-weight:bold;");

  // -----------------------------
  // CSS AAA
  // -----------------------------
  function injectCssOnce() {
    if (document.getElementById("vf-contracts-css")) return;
    const s = document.createElement("style");
    s.id = "vf-contracts-css";
    s.textContent = `
      .vf-ct-overlay{
        position:fixed; inset:0; z-index:9997;
        background: radial-gradient(1200px 600px at 25% 10%, rgba(96,165,250,.18), transparent 52%),
                    radial-gradient(1200px 600px at 85% 0%, rgba(251,191,36,.14), transparent 60%),
                    rgba(0,0,0,.72);
        backdrop-filter: blur(8px);
        display:none;
      }
      .vf-ct-overlay.active{display:block}
      .vf-ct-shell{max-width:1200px;margin:18px auto;padding:14px}
      .vf-ct-top{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        padding:12px; border-radius:18px;
        background: rgba(0,0,0,.38);
        border:1px solid rgba(255,255,255,.10);
        box-shadow: 0 10px 30px rgba(0,0,0,.28);
      }
      .vf-ct-title h2{
        margin:0; font-weight:1000; letter-spacing:.6px; text-transform:uppercase; font-size:14px
      }
      .vf-ct-title .sub{opacity:.75; font-weight:900; font-size:12px}

      .vf-btn{
        border-radius:14px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        color: rgba(255,255,255,.92);
        font-weight:1000;
        padding:10px 12px;
        cursor:pointer;
      }
      .vf-btn.primary{background: rgba(96,165,250,.20)}
      .vf-btn.warn{background: rgba(251,191,36,.16)}
      .vf-btn.bad{background: rgba(251,113,133,.14)}

      .vf-grid{display:grid;grid-template-columns: .85fr 1.15fr; gap:12px; margin-top:12px}
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
      .vf-pill.ok{color:#86efac}
      .vf-pill.warn{color:#fbbf24}
      .vf-pill.bad{color:#fb7185}
      .vf-pill.blue{color:#60a5fa}
      .vf-muted{opacity:.75}

      .vf-form{display:flex; gap:8px; flex-wrap:wrap}
      .vf-form input{
        flex:1;
        min-width: 210px;
        background: rgba(0,0,0,.35);
        color: rgba(255,255,255,.94);
        border:1px solid rgba(255,255,255,.10);
        border-radius:14px;
        padding:10px 12px;
        font-weight:1000;
        outline:none;
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
      .vf-item .r{display:flex; align-items:center; gap:8px; flex-wrap:wrap; justify-content:flex-end}
      .vf-kpi{min-width:84px; text-align:right; font-weight:1000}

      .vf-divider{height:1px;background: rgba(255,255,255,.08); margin:10px 0}
      .vf-note{
        padding: 10px;
        border-radius: 16px;
        border:1px solid rgba(255,255,255,.08);
        background: rgba(0,0,0,.28);
        font-weight:900;
        opacity:.9;
      }
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
  let searchText = "";

  function ensureOverlay() {
    injectCssOnce();
    if (overlay) return;

    overlay = el("div", "vf-ct-overlay");
    overlay.id = "vf-contracts-overlay";

    const shell = el("div", "vf-ct-shell");
    overlay.appendChild(shell);

    const top = el("div", "vf-ct-top");
    const title = el("div", "vf-ct-title");
    const h2 = el("h2", "", "Contratos & FFP");
    const sub = el("div", "sub", "Renovar • Rescindir • Folha e Teto");
    title.appendChild(h2);
    title.appendChild(sub);

    const actions = el("div", "");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.flexWrap = "wrap";

    const btnClose = el("button", "vf-btn", "Fechar");
    btnClose.onclick = () => ContractsUI.close();

    actions.appendChild(btnClose);

    top.appendChild(title);
    top.appendChild(actions);

    const grid = el("div", "vf-grid");

    const cardFFP = el("div", "vf-card");
    cardFFP.innerHTML = `<div class="hd"><div class="t">FFP / Folha</div><div id="vf-ct-pill" class="vf-pill warn">—</div></div>`;
    const ffpBody = el("div", "");
    ffpBody.id = "vf-ct-ffp-body";
    cardFFP.appendChild(ffpBody);

    const cardList = el("div", "vf-card");
    cardList.innerHTML = `<div class="hd"><div class="t">Elenco</div><div class="vf-pill blue" id="vf-ct-count">—</div></div>`;
    const form = el("div", "vf-form");
    const inp = document.createElement("input");
    inp.placeholder = "Buscar jogador (nome)…";
    inp.oninput = () => { searchText = String(inp.value || ""); render(); };
    form.appendChild(inp);

    const list = el("div", "vf-list");
    list.id = "vf-ct-list";

    cardList.appendChild(form);
    cardList.appendChild(el("div", "vf-divider"));
    cardList.appendChild(list);

    grid.appendChild(cardFFP);
    grid.appendChild(cardList);

    shell.appendChild(top);
    shell.appendChild(grid);

    document.body.appendChild(overlay);
  }

  function show() { if (overlay) overlay.classList.add("active"); }
  function hide() { if (overlay) overlay.classList.remove("active"); }

  // -----------------------------
  // Render
  // -----------------------------
  function renderFFP(teamId) {
    const pill = document.getElementById("vf-ct-pill");
    const body = document.getElementById("vf-ct-ffp-body");
    if (!body) return;

    clear(body);

    if (!window.Contracts) {
      body.appendChild(el("div", "vf-muted", "Contracts engine não carregado."));
      return;
    }

    try { if (Contracts && typeof Contracts.ensure === "function") Contracts.ensure(); } catch (e) {}

    const f = Contracts.getFFPStatus(teamId);
    const cap = n(f.cap, 0);
    const used = n(f.used, 0);
    const pct = n(f.pct, 0);

    if (pill) {
      pill.className = "vf-pill " + (f.level === "OK" ? "ok" : f.level === "WARN" ? "warn" : "bad");
      pill.textContent = f.level === "OK" ? "FFP OK" : f.level === "WARN" ? "FFP ATENÇÃO" : "FFP ESTOURADO";
    }

    const note = el("div", "vf-note");
    note.innerHTML = `
      <div style="font-weight:1000;">Folha mensal</div>
      <div class="vf-muted">${used.toFixed(2)} / ${cap.toFixed(2)} mi (${pct.toFixed(1)}%)</div>
    `;
    body.appendChild(note);

    const hint = el("div", "vf-note");
    hint.style.marginTop = "10px";
    hint.innerHTML = `
      <div style="font-weight:1000;">Dicas</div>
      <div class="vf-muted">
        • Renovar aumenta a folha.<br/>
        • Rescindir gera multa, mas alivia folha.<br/>
        • Liberar coloca o jogador livre no mercado.
      </div>
    `;
    body.appendChild(hint);
  }

  function renderList(teamId) {
    const list = document.getElementById("vf-ct-list");
    const count = document.getElementById("vf-ct-count");
    if (!list) return;

    clear(list);

    if (!window.Contracts) {
      list.appendChild(el("div", "vf-muted", "Contracts engine não carregado."));
      return;
    }

    const rows = Contracts.getTeamContracts(teamId) || [];
    const q = String(searchText || "").trim().toLowerCase();

    const filtered = q
      ? rows.filter(r => String(r.name || "").toLowerCase().includes(q))
      : rows;

    if (count) count.textContent = `${filtered.length} jogadores`;

    if (!filtered.length) {
      list.appendChild(el("div", "vf-muted", "Nenhum jogador encontrado."));
      return;
    }

    filtered.forEach(r => {
      const c = r.contract || {};
      const item = el("div", "vf-item");

      const left = el("div", "l");
      left.appendChild(el("div", "name", r.name));
      const end = `${String(c.endMonth || 1).padStart(2, "0")}/${c.endYear || "—"}`;
      left.appendChild(el("div", "sub", `OVR ${n(r.ovr,0)} • Idade ${n(r.age,0)} • Fim ${end}`));

      const right = el("div", "r");
      right.appendChild(el("div", "vf-kpi", `${n(c.salaryMonthly,0).toFixed(2)} mi/mês`));

      const btnRen = el("button", "vf-btn primary", "Renovar");
      btnRen.onclick = () => openRenewModal(r.playerId, r.name, c);

      const btnTerm = el("button", "vf-btn warn", "Rescindir");
      btnTerm.onclick = () => doTerminate(r.playerId, r.name);

      const btnRel = el("button", "vf-btn bad", "Liberar");
      btnRel.onclick = () => doRelease(r.playerId, r.name);

      right.appendChild(btnRen);
      right.appendChild(btnTerm);
      right.appendChild(btnRel);

      item.appendChild(left);
      item.appendChild(right);

      list.appendChild(item);
    });
  }

  function openRenewModal(playerId, name, c) {
    // Modal simples via prompt (mobile-friendly)
    const months = prompt(`Renovar ${name}\n\nMeses (6-60):`, "24");
    if (months == null) return;

    const salary = prompt(`Novo salário (mi/mês) para ${name}\nAtual: ${n(c.salaryMonthly,0).toFixed(2)}`, String(n(c.salaryMonthly, 0).toFixed(2)));
    if (salary == null) return;

    const clause = prompt(`Nova multa (mi) para ${name}\nAtual: ${n(c.releaseClause,0).toFixed(2)}`, String(n(c.releaseClause, 0).toFixed(2)));
    if (clause == null) return;

    try {
      const res = Contracts.renew(playerId, {
        months: n(months, 24),
        salaryMonthly: n(salary, n(c.salaryMonthly, 0)),
        releaseClause: n(clause, n(c.releaseClause, 0)),
        signingBonus: n(c.signingBonus, 0)
      });

      if (!res || !res.ok) {
        alert(res?.msg || "Falha ao renovar.");
      }
    } catch (e) {
      console.warn("[ContractsUI] renew error:", e);
      alert("Erro ao renovar.");
    }

    render();
  }

  function doTerminate(playerId, name) {
    const ok = confirm(`Rescindir contrato de ${name}?\n\nVai gerar multa e o jogador fica sem contrato ativo.`);
    if (!ok) return;

    try {
      const res = Contracts.terminate(playerId, {});
      if (!res || !res.ok) alert(res?.msg || "Falha ao rescindir.");
      else alert(`Rescisão concluída.\nMulta estimada: ${n(res.fee,0).toFixed(2)} mi`);
    } catch (e) {
      console.warn("[ContractsUI] terminate error:", e);
      alert("Erro ao rescindir.");
    }

    render();
  }

  function doRelease(playerId, name) {
    const ok = confirm(`Liberar ${name}?\n\nO jogador vira free agent (sem time).`);
    if (!ok) return;

    try {
      const res = Contracts.release(playerId);
      if (!res || !res.ok) alert(res?.msg || "Falha ao liberar.");
    } catch (e) {
      console.warn("[ContractsUI] release error:", e);
      alert("Erro ao liberar.");
    }

    render();
  }

  function render() {
    ensureOverlay();
    const teamId = getUserTeamId();
    if (!teamId) return;

    renderFFP(teamId);
    renderList(teamId);
  }

  // -----------------------------
  // Open/Close + Auto bind
  // -----------------------------
  function open() {
    ensureOverlay();
    render();
    show();
  }

  function close() { hide(); }

  function bindAuto() {
    const btn = document.getElementById("btn-contratos");
    if (btn && !btn.__vfBound) {
      btn.__vfBound = true;
      btn.addEventListener("click", () => open());
    }
    document.querySelectorAll("[data-action='contratos']").forEach(b => {
      if (b.__vfBound) return;
      b.__vfBound = true;
      b.addEventListener("click", () => open());
    });
  }

  setInterval(bindAuto, 800);

  window.ContractsUI = { open, render, close };
})();