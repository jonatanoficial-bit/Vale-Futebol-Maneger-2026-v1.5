/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/market.js — Mercado AAA (FFP/Wage Cap/Negociação Simples)
   -------------------------------------------------------
   Objetivo:
   - Fornecer uma base robusta de mercado estilo manager:
     • Lista de mercado (free agents + jogadores de outros clubes)
     • Preço de transferência (estimado por OVR + idade opcional)
     • Contratação com checagem de Wage Cap (FFP)
     • Integração com Contracts (wageMi, monthsLeft) quando existir
     • Integração com News + Save quando existir
   - Fallback seguro se algum módulo não existir

   API exposta:
   - Market.ensure()
   - Market.getMarketList(options?)
   - Market.signPlayer(teamId, playerId, offer?)
   - Market.buyPlayer(teamId, playerId, offer?)  // alias
   - Market.getAskingPrice(playerId)
   - Market.estimateWageMi(playerId)
   - Market.canAffordWage(teamId, wageMi)
   - Market.getTeamMoney(teamId)
   - Market.setTeamMoney(teamId, moneyMi)
   - Market.releasePlayer(playerId)  // vira free agent (teamId=0)

   Convenções:
   - Valores monetários em "milhões" (mi)
   - Wage cap: se Contracts.getWageCap existir, usa; senão fallback por divisão
   =======================================================*/

(function () {
  console.log("%c[Market] market.js carregado", "color:#f59e0b; font-weight:bold;");

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd() { return Math.random(); }
  function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
  function nowIso() { try { return new Date().toISOString(); } catch { return ""; } }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (gs.money == null) gs.money = 50; // saldo do usuário (fallback)
    if (!gs.market || typeof gs.market !== "object") gs.market = {};
    if (!gs.market.lastRefreshAt) gs.market.lastRefreshAt = null;
    if (!gs.market.cache || typeof gs.market.cache !== "object") gs.market.cache = {};
    return gs;
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

  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  // -----------------------------
  // News + Save (opcional)
  // -----------------------------
  function pushNews(title, body, tag) {
    try {
      if (window.News && typeof News.pushNews === "function") News.pushNews(title, body, tag || "MARKET");
    } catch (e) {}
  }

  function save() {
    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}
  }

  // -----------------------------
  // Contracts (opcional) — Wage cap / wages
  // -----------------------------
  function ensureContracts() {
    try { if (window.Contracts && typeof Contracts.ensure === "function") Contracts.ensure(); } catch (e) {}
  }

  function getWageCap(teamId) {
    try {
      if (window.Contracts && typeof Contracts.getWageCap === "function") return n(Contracts.getWageCap(teamId), 40);
      if (window.Contracts && typeof Contracts.wageCap === "number") return n(Contracts.wageCap, 40);
    } catch (e) {}

    const team = getTeamById(teamId);
    const div = String(team?.division || team?.serie || "A").toUpperCase();
    return div === "B" ? 25 : 45; // mi/mês
  }

  function getWageUsed(teamId) {
    try {
      if (window.Contracts && typeof Contracts.getWageUsed === "function") return n(Contracts.getWageUsed(teamId), 0);
      if (window.Contracts && typeof Contracts.recalcWageUsed === "function") {
        const v = Contracts.recalcWageUsed(teamId);
        if (v != null) return n(v, 0);
      }
      if (window.gameState && typeof gameState.wageUsed === "number") return n(gameState.wageUsed, 0);
    } catch (e) {}
    return 0;
  }

  function setContract(playerId, wageMi, monthsLeft) {
    try {
      if (window.Contracts && typeof Contracts.setContractForPlayer === "function") {
        Contracts.setContractForPlayer(playerId, { wageMi: n(wageMi, 0), monthsLeft: n(monthsLeft, 24) });
        return true;
      }
    } catch (e) {}
    return false;
  }

  function getContract(playerId) {
    try {
      if (window.Contracts && typeof Contracts.getContractForPlayer === "function") {
        return Contracts.getContractForPlayer(playerId);
      }
    } catch (e) {}
    return null;
  }

  // -----------------------------
  // Money (simples)
  // -----------------------------
  function getTeamMoney(teamId) {
    // por enquanto o jogo usa money global do usuário (fallback)
    const gs = ensureGS();
    const userTeamId = getUserTeamId();
    if (userTeamId && String(teamId) === String(userTeamId)) return n(gs.money, 0);
    // clubes IA (opcional): tenta budget no team
    const t = getTeamById(teamId);
    return n(t?.moneyMi ?? t?.budgetMi, 80);
  }

  function setTeamMoney(teamId, moneyMi) {
    const gs = ensureGS();
    const userTeamId = getUserTeamId();
    if (userTeamId && String(teamId) === String(userTeamId)) {
      gs.money = n(moneyMi, 0);
      return true;
    }
    const t = getTeamById(teamId);
    if (t) {
      t.moneyMi = n(moneyMi, 0);
      return true;
    }
    return false;
  }

  // -----------------------------
  // Estimativas (preço / salário)
  // -----------------------------
  function getOVR(p) { return n(p?.ovr ?? p?.overall, 60); }
  function getAge(p) { return n(p?.age ?? p?.idade, 25); }

  function estimateWageMi(playerId) {
    const p = getPlayers().find(x => String(x.id) === String(playerId));
    if (!p) return 0.30;

    // se já tem contrato:
    const c = getContract(playerId);
    if (c && c.wageMi != null) return clamp(n(c.wageMi, 0.3), 0.05, 4.5);

    const ovr = getOVR(p);
    const age = getAge(p);

    // faixa base por OVR
    let wage = 0.12 + ((ovr - 55) / 45) * 1.65; // ~0.12 a ~1.77
    // ajuste por idade (pico 26-29)
    if (age >= 26 && age <= 29) wage *= 1.12;
    else if (age >= 30 && age <= 33) wage *= 1.05;
    else if (age >= 34) wage *= 0.82;
    else if (age <= 21) wage *= 0.78;

    // variação pequena
    wage *= (0.92 + rnd() * 0.18);

    return clamp(wage, 0.08, 3.80);
  }

  function getAskingPrice(playerId) {
    const p = getPlayers().find(x => String(x.id) === String(playerId));
    if (!p) return 1.0;

    const ovr = getOVR(p);
    const age = getAge(p);

    // preço por OVR em mi
    let price = 0.6 + Math.pow((ovr - 50) / 10, 2) * 1.2; // cresce rápido com ovr
    // ajuste por idade (jovem vale mais)
    if (age <= 21) price *= 1.35;
    else if (age <= 24) price *= 1.15;
    else if (age >= 32) price *= 0.78;
    else if (age >= 35) price *= 0.62;

    // se for free agent: preço zero
    const isFree = (p?.isFreeAgent || p?.freeAgent || p?.teamId == null || String(p.teamId) === "0");
    if (isFree) price = 0;

    // variação
    price *= (0.90 + rnd() * 0.22);

    return clamp(price, 0, 120);
  }

  function canAffordWage(teamId, wageMi) {
    const cap = getWageCap(teamId);
    const used = getWageUsed(teamId);
    return (used + n(wageMi, 0)) <= cap;
  }

  // -----------------------------
  // Market list (cache leve)
  // -----------------------------
  function buildMarketList(teamId, options) {
    const all = getPlayers().slice();
    const mine = String(teamId);

    // free agents primeiro
    const free = all.filter(p => p?.isFreeAgent || p?.freeAgent || p?.teamId == null || String(p.teamId) === "0");
    const others = all.filter(p => String(p.teamId) !== mine && !(p?.isFreeAgent || p?.freeAgent || p?.teamId == null || String(p.teamId) === "0"));

    // recorte para performance
    const freeCut = free.slice(0, 120);
    const othersCut = others.slice(0, 220);

    let pool = freeCut.concat(othersCut);

    // filtros básicos
    const minOvr = options?.minOvr != null ? n(options.minOvr, 0) : null;
    const maxWage = options?.maxWage != null ? n(options.maxWage, 999) : null;
    const pos = options?.pos ? String(options.pos).toUpperCase() : null;

    function normPos(p) {
      const s = String(p.pos || p.position || "").toUpperCase();
      if (s.includes("GOL") || s === "GK") return "GOL";
      if (s.includes("ZAG") || s.includes("CB")) return "ZAG";
      if (s.includes("LD") || s.includes("RB")) return "LD";
      if (s.includes("LE") || s.includes("LB")) return "LE";
      if (s.includes("VOL") || s.includes("DM")) return "VOL";
      if (s.includes("MEI") || s.includes("MID") || s.includes("CM") || s.includes("AM")) return "MEI";
      if (s.includes("PON") || s.includes("W")) return "PON";
      if (s.includes("ATA") || s.includes("ST") || s.includes("FW")) return "ATA";
      return "MEI";
    }

    pool = pool.filter(p => {
      if (minOvr != null && getOVR(p) < minOvr) return false;
      if (maxWage != null && estimateWageMi(p.id) > maxWage) return false;
      if (pos && pos !== "TODAS" && normPos(p) !== pos) return false;
      return true;
    });

    // ordena: free agents (preço 0) + OVR desc
    pool.sort((a, b) => {
      const pa = getAskingPrice(a.id);
      const pb = getAskingPrice(b.id);
      if (pa !== pb) return pa - pb;
      return getOVR(b) - getOVR(a);
    });

    return pool.slice(0, 240);
  }

  // -----------------------------
  // Contratação (simples, mas “manager-like”)
  // -----------------------------
  function signPlayer(teamId, playerId, offer) {
    ensureGS();
    ensureContracts();

    const p = getPlayers().find(x => String(x.id) === String(playerId));
    if (!p) return { ok: false, msg: "Jogador não encontrado." };

    const fromTeamId = p.teamId;
    const isFree = (p?.isFreeAgent || p?.freeAgent || p?.teamId == null || String(p.teamId) === "0");

    // oferta
    const asking = getAskingPrice(playerId);
    const offerFee = offer?.feeMi != null ? n(offer.feeMi, 0) : asking; // para free agent = 0
    const wageMi = offer?.wageMi != null ? n(offer.wageMi, estimateWageMi(playerId)) : estimateWageMi(playerId);
    const monthsLeft = offer?.monthsLeft != null ? n(offer.monthsLeft, 24) : 24;

    // cheque folha / FFP
    const cap = getWageCap(teamId);
    const used = getWageUsed(teamId);
    if ((used + wageMi) > cap) {
      return { ok: false, msg: `FFP: Folha estourada. Cap ${cap.toFixed(2)} mi/mês, usado ${used.toFixed(2)} mi/mês.` };
    }

    // cheque dinheiro
    const money = getTeamMoney(teamId);
    if (!isFree && offerFee > money) {
      return { ok: false, msg: `Dinheiro insuficiente. Necessário R$ ${offerFee.toFixed(2)} mi, disponível R$ ${money.toFixed(2)} mi.` };
    }

    // aceitação simples:
    // - se oferta >= asking * 0.92 quase sempre aceita
    // - se oferta menor, chance reduz
    let accept = true;
    if (!isFree) {
      const ratio = asking <= 0 ? 1 : (offerFee / asking);
      const baseChance = clamp(0.25 + ratio * 0.75, 0.05, 0.98);
      accept = rnd() < baseChance;
    }

    if (!accept) {
      // contra-proposta simples
      const counterFee = isFree ? 0 : clamp(asking * (1.03 + rnd() * 0.15), asking, asking * 1.25);
      const counterWage = clamp(wageMi * (1.02 + rnd() * 0.12), wageMi, wageMi * 1.25);
      return {
        ok: false,
        msg: "Clube recusou. Quer contra-proposta?",
        counter: { feeMi: Number(counterFee.toFixed(2)), wageMi: Number(counterWage.toFixed(2)), monthsLeft }
      };
    }

    // aplica transferência
    if (!isFree) {
      setTeamMoney(teamId, money - offerFee);

      // opcional: paga ao clube vendedor (IA)
      try {
        if (fromTeamId && String(fromTeamId) !== "0") {
          const sellerMoney = getTeamMoney(fromTeamId);
          setTeamMoney(fromTeamId, sellerMoney + offerFee);
        }
      } catch (e) {}
    }

    p.teamId = teamId;
    p.isFreeAgent = false;
    p.freeAgent = false;

    // aplica contrato se puder
    setContract(playerId, wageMi, monthsLeft);

    // recalcula folha
    try { if (window.Contracts && typeof Contracts.recalcWageUsed === "function") Contracts.recalcWageUsed(teamId); } catch (e) {}

    // news
    const pName = p.name || p.nome || `Jogador ${p.id}`;
    const tName = getTeamById(teamId)?.name || "Seu clube";
    if (isFree) pushNews("Contratação (Agente livre)", `${tName} assinou com ${pName}. Salário: R$ ${wageMi.toFixed(2)} mi/mês`, "MARKET");
    else pushNews("Contratação", `${tName} comprou ${pName} por R$ ${offerFee.toFixed(2)} mi. Salário: R$ ${wageMi.toFixed(2)} mi/mês`, "MARKET");

    save();

    return { ok: true, msg: "Contratação realizada!" };
  }

  function releasePlayer(playerId) {
    ensureGS();
    const p = getPlayers().find(x => String(x.id) === String(playerId));
    if (!p) return { ok: false, msg: "Jogador não encontrado." };

    p.teamId = 0;
    p.isFreeAgent = true;
    p.freeAgent = true;

    pushNews("Rescisão", `${p.name || p.nome || "Jogador"} virou agente livre.`, "MARKET");
    save();
    return { ok: true, msg: "Jogador liberado." };
  }

  // -----------------------------
  // Public API
  // -----------------------------
  window.Market = {
    ensure() {
      ensureGS();
      ensureContracts();
    },

    getMarketList(options) {
      this.ensure();
      const gs = ensureGS();
      const teamId = getUserTeamId();
      const key = JSON.stringify({ teamId, options: options || {} });

      // cache rápido pra não travar no celular
      const cached = gs.market.cache[key];
      const now = Date.now();
      if (cached && cached.time && (now - cached.time) < 5000 && Array.isArray(cached.list)) {
        return cached.list;
      }

      const list = buildMarketList(teamId, options);
      gs.market.cache[key] = { time: now, list };
      gs.market.lastRefreshAt = nowIso();
      return list;
    },

    buyPlayer(teamId, playerId, offer) {
      return signPlayer(teamId, playerId, offer);
    },

    signPlayer(teamId, playerId, offer) {
      return signPlayer(teamId, playerId, offer);
    },

    getAskingPrice(playerId) {
      return getAskingPrice(playerId);
    },

    estimateWageMi(playerId) {
      return estimateWageMi(playerId);
    },

    canAffordWage(teamId, wageMi) {
      return canAffordWage(teamId, wageMi);
    },

    getTeamMoney(teamId) {
      return getTeamMoney(teamId);
    },

    setTeamMoney(teamId, moneyMi) {
      return setTeamMoney(teamId, moneyMi);
    },

    releasePlayer(playerId) {
      return releasePlayer(playerId);
    }
  };
})();