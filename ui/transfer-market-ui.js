/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/transfer-market-ui.js — Mercado AAA (SM26-like)
   -------------------------------------------------------
   - Overlay completo com 3 abas:
     • Buscar jogadores
     • Shortlist
     • Inbox (propostas recebidas)
     • Enviadas
   - Proposta com:
     • taxa, salário, meses, multa
   - Assinatura de free agents (sem taxa)
   - Integra com Market + Contracts (FFP alert)
   - Mobile-friendly (prompts simples)

   API:
   - TransferMarketUI.open(tab?)
   - TransferMarketUI.render()
   - TransferMarketUI.close()

   Bind:
   - #btn-mercado ou data-action="mercado"
   =======================================================*/

(function () {
  console.log("%c[TransferMarketUI] transfer-market-ui.js carregado", "color:#fbbf24; font-weight:bold;");

  // -----------------------------
  // CSS AAA
  // -----------------------------
  function injectCssOnce() {
    if (document.getElementById("vf-market-css")) return;
    const s = document.createElement("style");
    s.id = "vf-market-css";
    s.textContent = `
      .vf-mk-overlay{
        position:fixed; inset:0; z-index:9996;
        background: radial-gradient(1200px 600px at 20% 10%, rgba(251,191,36,.18), transparent 52%),
                    radial-gradient(1200px 600px at 85% 0%, rgba(96,165,250,.16), transparent 60%),
                    rgba(0,0,0,.74);
        backdrop-filter: blur(8px);
        display:none;
      }
      .vf-mk-overlay.active{display:block}
      .vf-mk-shell{max-width:1200px;margin:18px auto;padding:14px}
      .vf-mk-top{
        display:flex; align-items:center; justify-content:space-between; gap:10px;
        padding:12px; border-radius:18px;
        background: rgba(0,0,0,.38);
        border:1px solid rgba(255,255,255,.10);
        box-shadow: 0 10px 30px rgba(0,0,0,.28);
      }
      .vf-mk-title h2{margin:0;font-weight:1000;letter-spacing:.6px;text-transform:uppercase;font-size:14px}
      .vf-mk-title .sub{opacity:.75;font-weight:900;font-size:12px}
      .vf-btn{
        border-radius:14px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        color: rgba(255,255,255,.92);
        font-weight:1000;
        padding:10px 12px;
        cursor:pointer;
      }
      .vf-btn.primary{background: rgba(251,191,36,.18)}
      .vf-btn.blue{background: rgba(96,165,250,.18)}

      .vf-tabs{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}
      .vf-tab{
        border-radius:999px;
        padding:10px 12px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(0,0,0,.30);
        cursor:pointer;
        font-weight:1000;
        letter-spacing:.3px;
        font-size:12px;
        opacity:.9;
      }
      .vf-tab.active{
        background: rgba(251,191,36,.20);
        border-color: rgba(251,191,36,.30);
        opacity:1;
      }

      .vf-grid{display:grid;grid-template-columns: .85fr 1.15fr; gap:12px}
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
      .vf-form input, .vf-form select{
        flex:1;
        min-width: 180px;
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
      .vf-kpi{min-width:90px; text-align:right; font-weight:1000}

      .vf-note{
        padding: 10px;
        border-radius: 16px;
        border:1px solid rgba(255,255,255,.08);
        background: rgba(0,0,0,.28);
        font-weight:900;
        opacity:.9;
      }
      .vf-divider{height:1px;background: rgba(255,255,255,.08); margin:10px 0}
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
  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }
  function getPlayers() {
    return (window.Database && Array.isArray(Database.players)) ? Database.players : [];
  }
  function getTeamById(id) {
    return getTeams().find(t => String(t.id) === String(id)) || null;
  }
  function teamName(id) {
    return getTeamById(id)?.name || String(id || "—");
  }
  function playerName(p) {
    return p?.name || p?.nome || `Jogador ${p?.id || "—"}`;
  }
  function getOVR(p) { return n(p.ovr ?? p.overall, 60); }
  function getAge(p) { return n(p.age, 24); }
  function posLabel(p) { return String(p.position || p.posicao || "—").toUpperCase(); }

  // -----------------------------
  // State
  // -----------------------------
  let overlay = null;
  let activeTab = "SEARCH";
  let qName = "";
  let qPos = "ALL";
  let qMinOVR = 60;
  let qMaxAge = 35;

  // -----------------------------
  // Overlay
  // -----------------------------
  function ensureOverlay() {
    injectCssOnce();
    if (overlay) return;

    overlay = el("div", "vf-mk-overlay");
    overlay.id = "vf-market-overlay";

    const shell = el("div", "vf-mk-shell");
    overlay.appendChild(shell);

    const top = el("div", "vf-mk-top");
    const title = el("div", "vf-mk-title");
    title.appendChild(el("h2", "", "Mercado de Transferências"));
    title.appendChild(el("div", "sub", "Buscar • Shortlist • Propostas • Free Agents"));

    const actions = el("div", "");
    actions.style.display = "flex";
    actions.style.gap = "8px";
    actions.style.flexWrap = "wrap";

    const btnTick = el("button", "vf-btn blue", "Rodar IA");
    btnTick.onclick = () => {
      try {
        if (!window.Market) return alert("Market engine não carregado.");
        const res = Market.tickAI();
        render();
        if (res?.ok) alert(`IA do mercado rodou.\nNovas ofertas: ${res.createdOffers || 0}`);
      } catch (e) {
        console.warn(e);
        alert("Erro ao rodar IA.");
      }
    };

    const btnClose = el("button", "vf-btn", "Fechar");
    btnClose.onclick = () => TransferMarketUI.close();

    actions.appendChild(btnTick);
    actions.appendChild(btnClose);

    top.appendChild(title);
    top.appendChild(actions);

    // tabs
    const tabs = el("div", "vf-tabs");
    const tSearch = el("div", "vf-tab", "Buscar");
    const tShort = el("div", "vf-tab", "Shortlist");
    const tInbox = el("div", "vf-tab", "Inbox");
    const tSent = el("div", "vf-tab", "Enviadas");
    tSearch.dataset.tab = "SEARCH";
    tShort.dataset.tab = "SHORT";
    tInbox.dataset.tab = "INBOX";
    tSent.dataset.tab = "SENT";
    [tSearch, tShort, tInbox, tSent].forEach(t => {
      t.onclick = () => { activeTab = t.dataset.tab; render(); };
      tabs.appendChild(t);
    });

    // content
    const grid = el("div", "vf-grid");

    const left = el("div", "vf-card");
    left.id = "vf-mk-left";
    const right = el("div", "vf-card");
    right.id = "vf-mk-right";

    grid.appendChild(left);
    grid.appendChild(right);

    shell.appendChild(top);
    shell.appendChild(tabs);
    shell.appendChild(grid);

    document.body.appendChild(overlay);
  }

  function show() { if (overlay) overlay.classList.add("active"); }
  function hide() { if (overlay) overlay.classList.remove("active"); }

  // -----------------------------
  // Render helpers
  // -----------------------------
  function renderTabsActive() {
    overlay.querySelectorAll(".vf-tab").forEach(t => t.classList.toggle("active", (t.dataset.tab || "") === activeTab));
  }

  function renderFFPSummary(node, teamId) {
    clear(node);

    node.appendChild(el("div", "hd", ""));
    node.querySelector(".hd").appendChild(el("div", "t", "FFP / Folha"));

    let pill = el("div", "vf-pill warn", "—");

    if (window.Contracts && typeof Contracts.getFFPStatus === "function") {
      const f = Contracts.getFFPStatus(teamId);
      pill.className = "vf-pill " + (f.level === "OK" ? "ok" : f.level === "WARN" ? "warn" : "bad");
      pill.textContent = f.level === "OK" ? "FFP OK" : f.level === "WARN" ? "ATENÇÃO" : "ESTOURADO";
      node.querySelector(".hd").appendChild(pill);

      const note = el("div", "vf-note");
      note.innerHTML = `<div style="font-weight:1000;">Folha mensal</div><div class="vf-muted">${n(f.used,0).toFixed(2)} / ${n(f.cap,0).toFixed(2)} mi (${n(f.pct,0).toFixed(1)}%)</div>`;
      node.appendChild(note);
    } else {
      node.querySelector(".hd").appendChild(pill);
      node.appendChild(el("div", "vf-note vf-muted", "FFP indisponível (Contracts não carregado)."));
    }

    node.appendChild(el("div", "vf-divider"));
  }

  function makeOfferPrompt(teamId, p) {
    if (!window.Market) return alert("Market engine não carregado.");

    const value = Market.getPlayerValue(p.id);
    const sugSal = Market.getSuggestedSalary(p.id, teamId);
    const isFree = !p.teamId;

    if (isFree) {
      const sal = prompt(`Assinar FREE AGENT: ${playerName(p)}\n\nSalário sugerido: ${sugSal.toFixed(2)} mi/mês\nDigite salário (mi/mês):`, String(sugSal.toFixed(2)));
      if (sal == null) return;

      const months = prompt(`Duração (meses 6-60):`, "24");
      if (months == null) return;

      const clause = prompt(`Multa (mi) (sugestão: ${(value*1.1).toFixed(2)}):`, String((value*1.1).toFixed(2)));
      if (clause == null) return;

      const res = Market.signFreeAgent(teamId, p.id, {
        salaryMonthly: n(sal, sugSal),
        months: n(months, 24),
        releaseClause: n(clause, value*1.1),
        signingBonus: n(sal, sugSal) * 1.5
      });

      if (!res.ok) alert(res.msg || "Falha ao assinar.");
      else alert("Assinatura concluída!");
      render();
      return;
    }

    const fee = prompt(`Oferta por ${playerName(p)} (${teamName(p.teamId)})\n\nValor estimado: ${value.toFixed(2)} mi\nDigite taxa (mi):`, String(value.toFixed(2)));
    if (fee == null) return;

    const sal = prompt(`Salário sugerido: ${sugSal.toFixed(2)} mi/mês\nDigite salário (mi/mês):`, String(sugSal.toFixed(2)));
    if (sal == null) return;

    const months = prompt(`Duração (meses 6-60):`, "24");
    if (months == null) return;

    const clause = prompt(`Multa (mi) (sugestão: ${(value*1.2).toFixed(2)}):`, String((value*1.2).toFixed(2)));
    if (clause == null) return;

    const res = Market.makeOffer(p.teamId, p.id, {
      fee: n(fee, value),
      salaryMonthly: n(sal, sugSal),
      months: n(months, 24),
      releaseClause: n(clause, value*1.2),
      signingBonus: n(sal, sugSal) * 1.5
    });

    if (!res.ok) alert(res.msg || "Oferta falhou.");
    else alert("Oferta enviada!");
    render();
  }

  // -----------------------------
  // SEARCH tab
  // -----------------------------
  function renderSearch(left, right, teamId) {
    renderFFPSummary(left, teamId);

    // filtros
    const hd = el("div", "hd");
    hd.appendChild(el("div", "t", "Buscar jogadores"));
    const pill = el("div", "vf-pill blue", "Filtros");
    hd.appendChild(pill);
    left.appendChild(hd);

    const form = el("div", "vf-form");
    const inp = document.createElement("input");
    inp.placeholder = "Nome…";
    inp.value = qName;
    inp.oninput = () => { qName = String(inp.value || ""); render(); };

    const selPos = document.createElement("select");
    [["ALL","Todas"],["GK","Goleiro"],["CB","Zagueiro"],["LB","LE"],["RB","LD"],["DM","Volante"],["CM","Meia"],["AM","Armador"],["W","Ponta"],["ST","Atacante"]]
      .forEach(([v,l]) => {
        const o = document.createElement("option");
        o.value = v; o.textContent = l;
        if (qPos === v) o.selected = true;
        selPos.appendChild(o);
      });
    selPos.onchange = () => { qPos = selPos.value; render(); };

    const inpOvr = document.createElement("input");
    inpOvr.type = "number";
    inpOvr.min = "30"; inpOvr.max = "99";
    inpOvr.value = String(qMinOVR);
    inpOvr.placeholder = "OVR mínimo";
    inpOvr.oninput = () => { qMinOVR = n(inpOvr.value, 60); render(); };

    const inpAge = document.createElement("input");
    inpAge.type = "number";
    inpAge.min = "15"; inpAge.max = "45";
    inpAge.value = String(qMaxAge);
    inpAge.placeholder = "Idade máx.";
    inpAge.oninput = () => { qMaxAge = n(inpAge.value, 35); render(); };

    form.appendChild(inp);
    form.appendChild(selPos);
    form.appendChild(inpOvr);
    form.appendChild(inpAge);
    left.appendChild(form);

    left.appendChild(el("div", "vf-divider"));

    // lista resultados
    const list = el("div", "vf-list");
    const players = getPlayers();

    const nameQ = qName.trim().toLowerCase();
    const filtered = players.filter(p => {
      const nm = playerName(p).toLowerCase();
      if (nameQ && !nm.includes(nameQ)) return false;

      const ovr = getOVR(p);
      if (ovr < qMinOVR) return false;

      const age = getAge(p);
      if (age > qMaxAge) return false;

      if (qPos !== "ALL") {
        const pos = posLabel(p);
        if (!pos.includes(qPos)) return false;
      }

      // não mostra jogadores do próprio time como alvos (mas pode ser se quiser; aqui removemos)
      if (String(p.teamId) === String(teamId)) return false;

      return true;
    });

    const top = filtered
      .sort((a, b) => getOVR(b) - getOVR(a))
      .slice(0, 30);

    if (!top.length) {
      list.appendChild(el("div", "vf-muted", "Nenhum jogador encontrado."));
    } else {
      top.forEach(p => {
        const item = el("div", "vf-item");
        const leftCol = el("div", "l");
        leftCol.appendChild(el("div", "name", playerName(p)));
        const club = p.teamId ? teamName(p.teamId) : "FREE AGENT";
        const val = window.Market ? Market.getPlayerValue(p.id) : 0;
        leftCol.appendChild(el("div", "sub", `${club} • ${posLabel(p)} • OVR ${getOVR(p)} • ${getAge(p)} anos • Valor ${val.toFixed(2)} mi`));

        const rightCol = el("div", "r");
        const btnOffer = el("button", "vf-btn primary", p.teamId ? "Ofertar" : "Assinar");
        btnOffer.onclick = () => makeOfferPrompt(teamId, p);

        const btnShort = el("button", "vf-btn", "Shortlist");
        btnShort.onclick = () => { Market.toggleShortlist(teamId, p.id); render(); };

        rightCol.appendChild(btnOffer);
        rightCol.appendChild(btnShort);

        item.appendChild(leftCol);
        item.appendChild(rightCol);
        list.appendChild(item);
      });
    }

    right.appendChild(el("div", "hd", ""));
    right.querySelector(".hd").appendChild(el("div", "t", `Resultados (${top.length})`));
    right.appendChild(list);

    right.appendChild(el("div", "vf-divider"));

    const note = el("div", "vf-note");
    note.innerHTML = `<div style="font-weight:1000;">Dica AAA</div>
      <div class="vf-muted">Use a Shortlist para acompanhar alvos e comparar valor/OVR. A IA do mercado pode mandar ofertas pelo seu elenco.</div>`;
    right.appendChild(note);
  }

  // -----------------------------
  // SHORTLIST tab
  // -----------------------------
  function renderShort(left, right, teamId) {
    renderFFPSummary(left, teamId);

    const hd = el("div", "hd");
    hd.appendChild(el("div", "t", "Shortlist"));
    const pill = el("div", "vf-pill blue", "Observados");
    hd.appendChild(pill);
    left.appendChild(hd);

    const list = el("div", "vf-list");
    const ids = (window.Market ? Market.getShortlist(teamId) : []);
    const players = ids.map(id => getPlayers().find(p => String(p.id) === String(id))).filter(Boolean);

    if (!players.length) {
      list.appendChild(el("div", "vf-muted", "Sua shortlist está vazia."));
    } else {
      players.slice(0, 40).forEach(p => {
        const item = el("div", "vf-item");
        const l = el("div", "l");
        l.appendChild(el("div", "name", playerName(p)));
        const club = p.teamId ? teamName(p.teamId) : "FREE AGENT";
        const val = window.Market ? Market.getPlayerValue(p.id) : 0;
        l.appendChild(el("div", "sub", `${club} • ${posLabel(p)} • OVR ${getOVR(p)} • ${getAge(p)} anos • Valor ${val.toFixed(2)} mi`));

        const r = el("div", "r");
        const btnOffer = el("button", "vf-btn primary", p.teamId ? "Ofertar" : "Assinar");
        btnOffer.onclick = () => makeOfferPrompt(teamId, p);

        const btnRem = el("button", "vf-btn", "Remover");
        btnRem.onclick = () => { Market.toggleShortlist(teamId, p.id); render(); };

        r.appendChild(btnOffer);
        r.appendChild(btnRem);

        item.appendChild(l);
        item.appendChild(r);
        list.appendChild(item);
      });
    }

    right.appendChild(el("div", "hd", ""));
    right.querySelector(".hd").appendChild(el("div", "t", `Observados (${players.length})`));
    right.appendChild(list);
  }

  // -----------------------------
  // INBOX tab
  // -----------------------------
  function renderInbox(left, right, teamId) {
    renderFFPSummary(left, teamId);

    const hd = el("div", "hd");
    hd.appendChild(el("div", "t", "Inbox de Propostas"));
    const pill = el("div", "vf-pill warn", "Recebidas");
    hd.appendChild(pill);
    left.appendChild(hd);

    const offers = window.Market ? Market.getInbox(teamId) : [];
    const list = el("div", "vf-list");

    if (!offers.length) {
      list.appendChild(el("div", "vf-muted", "Nenhuma proposta recebida no momento."));
    } else {
      offers.slice(0, 30).forEach(o => {
        const p = getPlayers().find(x => String(x.id) === String(o.playerId));
        const item = el("div", "vf-item");
        const l = el("div", "l");
        l.appendChild(el("div", "name", `${playerName(p)} (${posLabel(p)} • OVR ${getOVR(p)})`));
        const feeTxt = o.type === "SIGNING" ? "Sem custo" : `${n(o.fee,0).toFixed(2)} mi`;
        l.appendChild(el("div", "sub", `De: ${teamName(o.fromTeamId)} • Taxa: ${feeTxt} • Salário: ${n(o.salaryMonthly,0).toFixed(2)} mi/mês • ${n(o.months,0)} meses`));

        const r = el("div", "r");
        const btnAcc = el("button", "vf-btn primary", "Aceitar");
        btnAcc.onclick = () => {
          const ok = confirm(`Aceitar proposta por ${playerName(p)}?\n\nTaxa: ${feeTxt}\nSalário pro jogador: ${n(o.salaryMonthly,0).toFixed(2)} mi/mês`);
          if (!ok) return;
          const res = Market.acceptOffer(teamId, o.id);
          if (!res.ok) alert(res.msg || "Falha ao aceitar.");
          render();
        };

        const btnRej = el("button", "vf-btn", "Rejeitar");
        btnRej.onclick = () => {
          const ok = confirm("Rejeitar esta proposta?");
          if (!ok) return;
          Market.rejectOffer(teamId, o.id);
          render();
        };

        r.appendChild(btnAcc);
        r.appendChild(btnRej);

        item.appendChild(l);
        item.appendChild(r);
        list.appendChild(item);
      });
    }

    right.appendChild(el("div", "hd", ""));
    right.querySelector(".hd").appendChild(el("div", "t", `Propostas (${offers.length})`));
    right.appendChild(list);

    right.appendChild(el("div", "vf-divider"));
    const note = el("div", "vf-note");
    note.innerHTML = `<div style="font-weight:1000;">Dica</div><div class="vf-muted">Aceitar vende o jogador e ele sai do seu clube. Rejeitar mantém no elenco.</div>`;
    right.appendChild(note);
  }

  // -----------------------------
  // SENT tab
  // -----------------------------
  function renderSent(left, right, teamId) {
    renderFFPSummary(left, teamId);

    const hd = el("div", "hd");
    hd.appendChild(el("div", "t", "Ofertas Enviadas"));
    const pill = el("div", "vf-pill blue", "Histórico");
    hd.appendChild(pill);
    left.appendChild(hd);

    const sent = window.Market ? Market.getSent(teamId) : [];
    const list = el("div", "vf-list");

    if (!sent.length) {
      list.appendChild(el("div", "vf-muted", "Você ainda não enviou ofertas."));
    } else {
      sent.slice(0, 40).forEach(o => {
        const p = getPlayers().find(x => String(x.id) === String(o.playerId));
        const item = el("div", "vf-item");
        const l = el("div", "l");
        l.appendChild(el("div", "name", `${playerName(p)} • ${teamName(o.toTeamId) || "FREE"}`));
        const feeTxt = o.type === "SIGNING" ? "Sem custo" : `${n(o.fee,0).toFixed(2)} mi`;
        l.appendChild(el("div", "sub", `Taxa: ${feeTxt} • Salário: ${n(o.salaryMonthly,0).toFixed(2)} mi/mês • ${n(o.months,0)} meses • Status: ${o.status}`));

        const r = el("div", "r");
        const statusPill = el("div", "vf-pill " + (o.status === "ACCEPTED" ? "ok" : o.status === "REJECTED" ? "bad" : "warn"), o.status);
        r.appendChild(statusPill);

        item.appendChild(l);
        item.appendChild(r);
        list.appendChild(item);
      });
    }

    right.appendChild(el("div", "hd", ""));
    right.querySelector(".hd").appendChild(el("div", "t", `Enviadas (${sent.length})`));
    right.appendChild(list);
  }

  // -----------------------------
  // Render main
  // -----------------------------
  function render() {
    ensureOverlay();
    if (!overlay) return;

    if (!window.Market) {
      alert("Market engine não carregado. Verifique se engine/transfer-market.js está sendo importado.");
      return;
    }
    try { Market.ensure(); } catch (e) {}

    const teamId = getUserTeamId();
    if (!teamId) return;

    renderTabsActive();

    const left = document.getElementById("vf-mk-left");
    const right = document.getElementById("vf-mk-right");
    if (!left || !right) return;

    clear(left);
    clear(right);

    if (activeTab === "SEARCH") renderSearch(left, right, teamId);
    else if (activeTab === "SHORT") renderShort(left, right, teamId);
    else if (activeTab === "INBOX") renderInbox(left, right, teamId);
    else if (activeTab === "SENT") renderSent(left, right, teamId);
    else renderSearch(left, right, teamId);
  }

  // -----------------------------
  // Open / Close / Auto bind
  // -----------------------------
  function open(tab) {
    ensureOverlay();
    if (tab) activeTab = String(tab).toUpperCase();
    render();
    show();
  }

  function close() { hide(); }

  function bindAuto() {
    const btn = document.getElementById("btn-mercado");
    if (btn && !btn.__vfBound) {
      btn.__vfBound = true;
      btn.addEventListener("click", () => open("SEARCH"));
    }
    document.querySelectorAll("[data-action='mercado']").forEach(b => {
      if (b.__vfBound) return;
      b.__vfBound = true;
      b.addEventListener("click", () => open("SEARCH"));
    });
  }
  setInterval(bindAuto, 800);

  window.TransferMarketUI = { open, render, close };
})();