/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/market.js — Mercado + Integração Contratos/Salários
   -------------------------------------------------------
   Este arquivo entrega 2 camadas:
   - window.Market (engine): filtros + compra
   - window.MarketUI (UI): renderiza a tela #lista-mercado

   Compatibilidade:
   - Ui/market-ui.js (wrapper) pode chamar MarketUI.renderMarket()
   - Se existir Game.saldo legado, usamos gameState.balance como fonte real
   =======================================================*/

(function () {
  console.log("%c[Market] market.js (engine+ui) carregado", "color:#0EA5E9; font-weight:bold;");

  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    if (typeof gameState.balance !== "number") gameState.balance = 50;
    return window.gameState;
  }

  function getPlayersArray() {
    if (window.Database && Array.isArray(Database.players)) return Database.players;
    try { if (Array.isArray(players)) return players; } catch (e) {}
    return [];
  }

  function getTeamsArray() {
    if (window.Database && Array.isArray(Database.teams)) return Database.teams;
    try { if (Array.isArray(teams)) return teams; } catch (e) {}
    return [];
  }

  function getTeamById(id) {
    return getTeamsArray().find(t => t.id === id) || null;
  }

  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  function moneyMi(x) {
    return `${n(x, 0).toFixed(2)} mi`;
  }

  function clear(el) { if (!el) return; while (el.firstChild) el.removeChild(el.firstChild); }
  function el(tag, cls, txt) { const d = document.createElement(tag); if (cls) d.className = cls; if (txt != null) d.textContent = txt; return d; }

  // -----------------------------
  // ENGINE: Market
  // -----------------------------
  function normalizePos(p) {
    return String(p || "").toUpperCase().trim();
  }

  function getJogadoresFiltrados(filtros) {
    const teamId = getUserTeamId();
    const all = getPlayersArray();

    const pos = normalizePos(filtros?.posicao || "");
    const minOvr = n(filtros?.minOvr, 0);
    const maxOvr = n(filtros?.maxOvr, 99);
    const premium = !!filtros?.premium;

    // Premium = jogadores com OVR >= 84 (pode ajustar depois)
    const premMin = 84;

    return all
      .filter(p => String(p.teamId) !== String(teamId)) // fora do elenco do usuário
      .filter(p => {
        const ovr = n(p.overall ?? p.ovr, 0);
        if (ovr < minOvr || ovr > maxOvr) return false;
        if (premium && ovr < premMin) return false;
        if (pos && pos !== "TODOS" && normalizePos(p.position || p.pos) !== pos) return false;
        return true;
      })
      .sort((a, b) => n(b.overall ?? b.ovr, 0) - n(a.overall ?? a.ovr, 0));
  }

  function comprarJogador(jogadorId) {
    const gs = ensureGS();
    const teamId = getUserTeamId();
    if (!teamId) { alert("Nenhum time selecionado."); return false; }

    // garante Contracts
    if (window.Contracts && typeof Contracts.ensure === "function") Contracts.ensure();

    const all = getPlayersArray();
    const p = all.find(x => String(x.id) === String(jogadorId));
    if (!p) { alert("Jogador não encontrado."); return false; }

    if (String(p.teamId) === String(teamId)) {
      alert("Esse jogador já está no seu elenco.");
      return false;
    }

    const fee = n(p.value, 0); // milhões (taxa de transferência simplificada)
    const contract = (window.Contracts && typeof Contracts.ensurePlayerContract === "function")
      ? Contracts.ensurePlayerContract(p.id, p)
      : { salary: 0.2, monthsLeft: 24 };

    const addedSalary = n(contract.salary, 0);

    // valida saldo
    if (window.Contracts && typeof Contracts.canAffordTransfer === "function") {
      if (!Contracts.canAffordTransfer(teamId, fee)) {
        alert(`Saldo insuficiente.\nCusto: ${moneyMi(fee)} | Saldo: ${moneyMi(gs.balance)}`);
        return false;
      }
    } else {
      if (gs.balance < fee) {
        alert(`Saldo insuficiente.\nCusto: ${moneyMi(fee)} | Saldo: ${moneyMi(gs.balance)}`);
        return false;
      }
    }

    // valida folha
    if (window.Contracts && typeof Contracts.recalcWageUsed === "function") {
      Contracts.recalcWageUsed(teamId);
    }
    if (window.Contracts && typeof Contracts.canAffordWages === "function") {
      if (!Contracts.canAffordWages(teamId, addedSalary)) {
        const cf = Contracts.getClubFinance(teamId);
        alert(
          `Folha estouraria!\nSalário do jogador: ${moneyMi(addedSalary)}/mês\nFolha: ${moneyMi(cf.wageUsed)} / Orçamento: ${moneyMi(cf.wageBudget)}`
        );
        return false;
      }
    }

    // aplica compra: debita saldo e muda teamId
    gs.balance = Math.round((n(gs.balance, 0) - fee) * 100) / 100;
    p.teamId = teamId;

    // novo contrato ao chegar (se já existia, reseta para padrão seguro)
    if (window.Contracts && typeof Contracts.setPlayerContract === "function") {
      const newSalary = (window.Contracts && typeof Contracts.estimateSalary === "function")
        ? Contracts.estimateSalary(p)
        : addedSalary;

      Contracts.setPlayerContract(p.id, newSalary, 24);
      Contracts.recalcWageUsed(teamId);
    }

    // compat com Game.saldo legado
    if (window.Game) {
      if (typeof Game.saldo === "number") Game.saldo = gs.balance;
      if (Array.isArray(Game.elenco)) {
        // tenta manter coerência em versões antigas (se seu jogo usar Game.elenco)
        const already = Game.elenco.some(x => String(x.id) === String(p.id));
        if (!already) Game.elenco.push(p);
      }
      if (typeof Game.onElencoAtualizado === "function") Game.onElencoAtualizado();
    }

    // notícia
    try {
      if (window.News && typeof News.pushNews === "function") {
        const t = getTeamById(teamId);
        News.pushNews(
          "Contratação confirmada",
          `${p.name || p.nome || "Jogador"} chegou ao ${t?.name || teamId} por ${moneyMi(fee)}. Salário: ${moneyMi((Contracts.getPlayerContract(p.id)?.salary ?? newSalary))}/mês.`,
          "TRANSFER"
        );
      }
    } catch (e) {}

    alert(`Contratado!\n${p.name || p.nome} por ${moneyMi(fee)}\nNovo saldo: ${moneyMi(gs.balance)}`);
    return true;
  }

  window.Market = {
    getJogadoresFiltrados,
    comprarJogador
  };

  // -----------------------------
  // UI: MarketUI
  // -----------------------------
  function renderMarket() {
    const box = document.getElementById("lista-mercado");
    if (!box) {
      console.warn("[MarketUI] #lista-mercado não encontrado");
      return;
    }
    clear(box);

    const gs = ensureGS();
    const teamId = getUserTeamId();
    if (!teamId) {
      box.appendChild(el("div", "", "Nenhum time selecionado."));
      return;
    }

    if (window.Contracts && typeof Contracts.ensure === "function") Contracts.ensure();
    if (window.Contracts && typeof Contracts.recalcWageUsed === "function") Contracts.recalcWageUsed(teamId);

    const cf = (window.Contracts && typeof Contracts.getClubFinance === "function")
      ? Contracts.getClubFinance(teamId)
      : { wageUsed: 0, wageBudget: 0, balance: gs.balance };

    // Header AAA
    const header = el("div", "");
    header.style.background = "rgba(10,10,10,0.82)";
    header.style.border = "1px solid rgba(255,255,255,0.08)";
    header.style.borderRadius = "16px";
    header.style.padding = "12px";
    header.style.marginBottom = "12px";
    header.style.boxShadow = "0 0 18px rgba(0,0,0,0.55)";

    const h1 = el("div", "");
    h1.style.display = "flex";
    h1.style.justifyContent = "space-between";
    h1.style.alignItems = "center";
    h1.style.gap = "10px";

    const title = el("div", "", "MERCADO");
    title.style.fontWeight = "900";
    title.style.letterSpacing = "0.6px";

    const badges = el("div", "");
    badges.style.display = "flex";
    badges.style.gap = "8px";
    badges.style.flexWrap = "wrap";

    const b1 = el("div", "", `Saldo: ${moneyMi(gs.balance)}`);
    b1.style.padding = "6px 10px";
    b1.style.borderRadius = "999px";
    b1.style.border = "1px solid rgba(255,255,255,0.10)";
    b1.style.background = "rgba(255,255,255,0.04)";
    b1.style.fontWeight = "900";
    b1.style.fontSize = "12px";

    const b2 = el("div", "", `Folha: ${moneyMi(cf.wageUsed)} / ${moneyMi(cf.wageBudget)} (mês)`);
    b2.style.padding = "6px 10px";
    b2.style.borderRadius = "999px";
    b2.style.border = "1px solid rgba(255,255,255,0.10)";
    b2.style.background = "rgba(255,255,255,0.04)";
    b2.style.fontWeight = "900";
    b2.style.fontSize = "12px";

    if (n(cf.wageUsed, 0) > n(cf.wageBudget, 0)) {
      b2.style.border = "1px solid rgba(255,90,90,0.6)";
      b2.style.background = "rgba(255,90,90,0.12)";
    }

    badges.appendChild(b1);
    badges.appendChild(b2);

    h1.appendChild(title);
    h1.appendChild(badges);

    // Filtros
    const filters = el("div", "");
    filters.style.display = "grid";
    filters.style.gridTemplateColumns = "repeat(auto-fit, minmax(160px, 1fr))";
    filters.style.gap = "10px";
    filters.style.marginTop = "12px";

    function field(labelTxt, inputEl) {
      const wrap = el("div", "");
      const lab = el("div", "", labelTxt);
      lab.style.fontSize = "11px";
      lab.style.fontWeight = "900";
      lab.style.opacity = "0.75";
      lab.style.marginBottom = "6px";
      wrap.appendChild(lab);
      wrap.appendChild(inputEl);
      return wrap;
    }

    const selPos = document.createElement("select");
    ["TODOS","GOL","ZAG","LD","LE","VOL","MEI","ATA"].forEach(v => {
      const o = document.createElement("option");
      o.value = v; o.textContent = v;
      selPos.appendChild(o);
    });
    selPos.style.padding = "10px";
    selPos.style.borderRadius = "12px";
    selPos.style.border = "1px solid rgba(255,255,255,0.10)";
    selPos.style.background = "rgba(0,0,0,0.35)";
    selPos.style.color = "white";
    selPos.style.fontWeight = "900";

    const minO = document.createElement("input");
    minO.type = "number"; minO.value = "0"; minO.min = "0"; minO.max = "99";
    minO.style.padding = "10px";
    minO.style.borderRadius = "12px";
    minO.style.border = "1px solid rgba(255,255,255,0.10)";
    minO.style.background = "rgba(0,0,0,0.35)";
    minO.style.color = "white";
    minO.style.fontWeight = "900";

    const maxO = document.createElement("input");
    maxO.type = "number"; maxO.value = "99"; maxO.min = "0"; maxO.max = "99";
    maxO.style.padding = "10px";
    maxO.style.borderRadius = "12px";
    maxO.style.border = "1px solid rgba(255,255,255,0.10)";
    maxO.style.background = "rgba(0,0,0,0.35)";
    maxO.style.color = "white";
    maxO.style.fontWeight = "900";

    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.style.transform = "scale(1.2)";
    const chkWrap = el("label", "");
    chkWrap.style.display = "flex";
    chkWrap.style.alignItems = "center";
    chkWrap.style.gap = "10px";
    chkWrap.style.padding = "10px";
    chkWrap.style.borderRadius = "12px";
    chkWrap.style.border = "1px solid rgba(255,255,255,0.10)";
    chkWrap.style.background = "rgba(0,0,0,0.35)";
    chkWrap.style.fontWeight = "900";
    chkWrap.appendChild(chk);
    chkWrap.appendChild(el("span", "", "Premium (OVR 84+)"));

    filters.appendChild(field("Posição", selPos));
    filters.appendChild(field("OVR mínimo", minO));
    filters.appendChild(field("OVR máximo", maxO));
    filters.appendChild(field("Filtro", chkWrap));

    header.appendChild(h1);
    header.appendChild(filters);
    box.appendChild(header);

    const list = el("div", "");
    list.style.display = "grid";
    list.style.gridTemplateColumns = "repeat(auto-fit, minmax(260px, 1fr))";
    list.style.gap = "12px";
    box.appendChild(list);

    function renderList() {
      clear(list);

      const filtros = {
        posicao: selPos.value,
        minOvr: n(minO.value, 0),
        maxOvr: n(maxO.value, 99),
        premium: chk.checked
      };

      const arr = getJogadoresFiltrados(filtros);
      if (!arr.length) {
        const empty = el("div", "");
        empty.textContent = "Nenhum jogador encontrado com esses filtros.";
        empty.style.opacity = "0.8";
        list.appendChild(empty);
        return;
      }

      arr.slice(0, 60).forEach((p) => {
        const card = el("div", "");
        card.style.background = "rgba(10,10,10,0.82)";
        card.style.border = "1px solid rgba(255,255,255,0.08)";
        card.style.borderRadius = "16px";
        card.style.padding = "10px";
        card.style.boxShadow = "0 0 18px rgba(0,0,0,0.55)";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.gap = "10px";

        const top = el("div", "");
        top.style.display = "flex";
        top.style.justifyContent = "space-between";
        top.style.alignItems = "center";
        top.style.gap = "10px";

        const nm = el("div", "");
        nm.style.fontWeight = "900";
        nm.style.fontSize = "14px";
        nm.style.whiteSpace = "nowrap";
        nm.style.overflow = "hidden";
        nm.style.textOverflow = "ellipsis";
        nm.textContent = p.name || p.nome || "Jogador";

        const ovr = el("div", "");
        ovr.style.fontWeight = "900";
        ovr.style.padding = "6px 8px";
        ovr.style.borderRadius = "999px";
        ovr.style.background = "rgba(34,197,94,0.12)";
        ovr.style.border = "1px solid rgba(34,197,94,0.35)";
        ovr.style.fontSize = "12px";
        ovr.textContent = `OVR ${n(p.overall ?? p.ovr, 0)}`;

        top.appendChild(nm);
        top.appendChild(ovr);

        const mid = el("div", "");
        mid.style.display = "flex";
        mid.style.justifyContent = "space-between";
        mid.style.opacity = "0.85";
        mid.style.fontSize = "12px";
        mid.textContent = `${p.position || p.pos || "POS"} • Valor: ${moneyMi(p.value)}`;

        let salaryPreview = 0.2;
        try {
          if (window.Contracts && typeof Contracts.ensurePlayerContract === "function") {
            const c = Contracts.ensurePlayerContract(p.id, p);
            salaryPreview = n(c?.salary, salaryPreview);
          }
        } catch (e) {}

        const sal = el("div", "");
        sal.style.opacity = "0.85";
        sal.style.fontSize = "12px";
        sal.textContent = `Salário estimado: ${moneyMi(salaryPreview)}/mês`;

        const btn = document.createElement("button");
        btn.className = "btn-green";
        btn.textContent = "CONTRATAR";
        btn.onclick = () => {
          const ok = comprarJogador(p.id);
          if (ok) {
            // atualiza topo (saldo/folha) e lista
            if (window.Contracts && typeof Contracts.recalcWageUsed === "function") Contracts.recalcWageUsed(teamId);
            const cf2 = Contracts.getClubFinance(teamId);
            b1.textContent = `Saldo: ${moneyMi(ensureGS().balance)}`;
            b2.textContent = `Folha: ${moneyMi(cf2.wageUsed)} / ${moneyMi(cf2.wageBudget)} (mês)`;
            if (n(cf2.wageUsed, 0) > n(cf2.wageBudget, 0)) {
              b2.style.border = "1px solid rgba(255,90,90,0.6)";
              b2.style.background = "rgba(255,90,90,0.12)";
            } else {
              b2.style.border = "1px solid rgba(255,255,255,0.10)";
              b2.style.background = "rgba(255,255,255,0.04)";
            }
            renderList();
          }
        };

        card.appendChild(top);
        card.appendChild(mid);
        card.appendChild(sal);
        card.appendChild(btn);

        list.appendChild(card);
      });
    }

    selPos.onchange = renderList;
    minO.oninput = renderList;
    maxO.oninput = renderList;
    chk.onchange = renderList;

    renderList();
  }

  window.MarketUI = {
    renderMarket
  };
})();