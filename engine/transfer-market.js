/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/transfer-market.js — Mercado de Transferências AAA
   -------------------------------------------------------
   Features:
   - Shortlist (observados)
   - Propostas (enviadas e recebidas)
   - Aceitar / Rejeitar
   - Valuation + wage suggestion
   - Integração com Contracts (FFP / teto de folha)
   - IA de mercado: clubes fazem ofertas (ciclo semanal)
   - Free agents: jogadores sem time podem ser assinados

   Persistência:
   gameState.market = {
     shortlist: { [teamId]: [playerId...] },
     sentOffers: [offer...],
     inboxOffers: { [teamId]: [offer...] },
     lastTickISO: null,
     settings: { aiEnabled:true }
   }

   Offer format:
   {
     id, iso, type:"TRANSFER"|"SIGNING",
     fromTeamId, toTeamId,
     playerId,
     fee, salaryMonthly, months, releaseClause, signingBonus,
     status:"PENDING"|"ACCEPTED"|"REJECTED"|"EXPIRED",
     message
   }

   API:
   - Market.ensure()
   - Market.getPlayerValue(playerId)
   - Market.getSuggestedSalary(playerId, toTeamId)
   - Market.toggleShortlist(teamId, playerId)
   - Market.getShortlist(teamId)
   - Market.makeOffer(toTeamId, playerId, offerData)
   - Market.getInbox(teamId)
   - Market.getSent(teamId)
   - Market.acceptOffer(teamId, offerId)
   - Market.rejectOffer(teamId, offerId)
   - Market.signFreeAgent(teamId, playerId, contractData)
   - Market.tickAI()   // roda IA (1x/semana recomendado)
   =======================================================*/

(function () {
  console.log("%c[Market] transfer-market.js carregado", "color:#fbbf24; font-weight:bold;");

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd() { return Math.random(); }
  function nowISO() { return new Date().toISOString(); }
  function uid() { return "of_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16); }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.seasonYear) gs.seasonYear = 2026;

    if (!gs.market || typeof gs.market !== "object") gs.market = {};
    const mk = gs.market;

    if (!mk.shortlist || typeof mk.shortlist !== "object") mk.shortlist = {};
    if (!Array.isArray(mk.sentOffers)) mk.sentOffers = [];
    if (!mk.inboxOffers || typeof mk.inboxOffers !== "object") mk.inboxOffers = {};
    if (!mk.settings || typeof mk.settings !== "object") mk.settings = { aiEnabled: true };
    if (mk.lastTickISO === undefined) mk.lastTickISO = null;

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
  function getPlayerById(id) {
    return getPlayers().find(p => String(p.id) === String(id)) || null;
  }
  function getTeamPlayers(teamId) {
    return getPlayers().filter(p => String(p.teamId) === String(teamId));
  }

  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  function save() {
    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}
  }
  function news(title, body) {
    try { if (window.News && typeof News.pushNews === "function") News.pushNews(title, body, "MARKET"); } catch (e) {}
  }

  function getOVR(p) { return n(p.ovr ?? p.overall, 60); }
  function getPOT(p) { return n(p.pot ?? p.potential, Math.max(getOVR(p), 70)); }
  function getAge(p) {
    if (p.age != null) return n(p.age, 24);
    if (p.birthYear != null) {
      const y = ensureGS().seasonYear || 2026;
      return clamp(y - n(p.birthYear, y - 24), 15, 45);
    }
    return 24;
  }

  // -----------------------------
  // Valuation + Salary suggestions
  // -----------------------------
  function playerValue(playerId) {
    const p = getPlayerById(playerId);
    if (!p) return 0;

    const ovr = clamp(getOVR(p), 35, 95);
    const pot = clamp(getPOT(p), 40, 99);
    const age = clamp(getAge(p), 15, 45);

    // base (mi)
    // ovr e pot pesam, idade jovem aumenta.
    const base = Math.pow((ovr - 35) / 60, 2.0) * 45; // 0..45
    const potBonus = Math.pow((pot - ovr) / 30, 2.0) * 10; // 0..10
    const ageMul =
      age <= 20 ? 1.45 :
      age <= 23 ? 1.25 :
      age <= 27 ? 1.05 :
      age <= 30 ? 0.95 :
      age <= 33 ? 0.82 :
      0.65;

    // reputação do clube vendedor
    const seller = p.teamId ? getTeamById(p.teamId) : null;
    const rep = n(seller?.reputation || seller?.prestige || 50, 50);
    const repMul = clamp(0.85 + (rep / 100) * 0.55, 0.85, 1.35);

    // contrato: se Contracts existir, usa cláusula como teto indireto
    let clause = 0;
    try {
      if (window.Contracts && typeof Contracts.getPlayerContract === "function") {
        clause = n(Contracts.getPlayerContract(p.id)?.releaseClause, 0);
      }
    } catch (e) {}

    let value = (base + potBonus + 2.5) * ageMul * repMul;

    // free agent: value menor (sem taxa)
    if (!p.teamId) value *= 0.25;

    // se tiver cláusula e for menor que value*1.2, ajusta value perto da cláusula
    if (clause > 0 && p.teamId) {
      value = Math.min(value, clause * 1.10);
      value = Math.max(value, clause * 0.72);
    }

    return Number(clamp(value, 0.3, 180).toFixed(2));
  }

  function suggestedSalary(playerId, toTeamId) {
    const p = getPlayerById(playerId);
    if (!p) return 0.1;
    const ovr = clamp(getOVR(p), 40, 95);
    const age = clamp(getAge(p), 15, 45);

    // base wage (mi/mês)
    const scaled = Math.pow((ovr - 40) / 55, 2.0); // 0..1
    let wage = 0.06 + scaled * 1.85;

    // idade jovem aceita menos, veterano experiente pede mais
    if (age <= 20) wage *= 0.88;
    else if (age >= 31) wage *= 1.10;

    // destino: Série A paga mais
    const t = toTeamId ? getTeamById(toTeamId) : null;
    const div = String(t?.division || t?.serie || "A").toUpperCase();
    if (div === "A") wage *= 1.08;
    else if (div === "B") wage *= 0.92;

    return Number(clamp(wage, 0.04, 3.8).toFixed(2));
  }

  function canAffordWage(teamId, addedSalary) {
    try {
      if (window.Contracts && typeof Contracts.getFFPStatus === "function") {
        const f = Contracts.getFFPStatus(teamId);
        return (n(f.used, 0) + n(addedSalary, 0)) <= n(f.cap, 999);
      }
    } catch (e) {}
    return true; // se não tiver FFP, deixa
  }

  // -----------------------------
  // Shortlist
  // -----------------------------
  function getShortlist(teamId) {
    const gs = ensureGS();
    const mk = gs.market;
    const tid = String(teamId || "");
    if (!mk.shortlist[tid]) mk.shortlist[tid] = [];
    return mk.shortlist[tid].slice();
  }

  function toggleShortlist(teamId, playerId) {
    const gs = ensureGS();
    const mk = gs.market;
    const tid = String(teamId || "");
    const pid = String(playerId || "");
    if (!tid || !pid) return [];

    if (!mk.shortlist[tid]) mk.shortlist[tid] = [];
    const list = mk.shortlist[tid];

    const idx = list.findIndex(x => String(x) === pid);
    if (idx >= 0) list.splice(idx, 1);
    else list.unshift(pid);

    mk.shortlist[tid] = list.slice(0, 60);
    save();
    return mk.shortlist[tid].slice();
  }

  // -----------------------------
  // Offers: make, inbox, sent
  // -----------------------------
  function ensureInbox(teamId) {
    const gs = ensureGS();
    const mk = gs.market;
    const tid = String(teamId || "");
    if (!mk.inboxOffers[tid]) mk.inboxOffers[tid] = [];
    return mk.inboxOffers[tid];
  }

  function makeOffer(toTeamId, playerId, offerData) {
    const gs = ensureGS();
    const mk = gs.market;

    const fromTeamId = getUserTeamId();
    if (!fromTeamId) return { ok: false, msg: "Time do usuário não definido." };

    const p = getPlayerById(playerId);
    if (!p) return { ok: false, msg: "Jogador não encontrado." };

    const pid = String(playerId);
    const sellerTeamId = p.teamId ? String(p.teamId) : null;

    // se jogador tem time, toTeamId deve ser esse time
    if (sellerTeamId && String(toTeamId) !== sellerTeamId) {
      return { ok: false, msg: "Time vendedor inválido para este jogador." };
    }

    // free agent: tipo SIGNING e toTeamId pode ser null
    const isFree = !sellerTeamId;

    const fee = Number(clamp(n(offerData?.fee, isFree ? 0 : playerValue(pid)), 0, 999).toFixed(2));
    const salaryMonthly = Number(clamp(n(offerData?.salaryMonthly, suggestedSalary(pid, fromTeamId)), 0.03, 50).toFixed(2));
    const months = clamp(n(offerData?.months, 24), 6, 60);
    const releaseClause = Number(clamp(n(offerData?.releaseClause, playerValue(pid) * 1.2), 0, 999).toFixed(2));
    const signingBonus = Number(clamp(n(offerData?.signingBonus, salaryMonthly * 1.5), 0, 999).toFixed(2));

    if (!canAffordWage(fromTeamId, salaryMonthly)) {
      return { ok: false, msg: "FFP: salário estoura o teto de folha." };
    }

    const offer = {
      id: uid(),
      iso: nowISO(),
      type: isFree ? "SIGNING" : "TRANSFER",
      fromTeamId: String(fromTeamId),
      toTeamId: sellerTeamId ? String(sellerTeamId) : null,
      playerId: pid,
      fee,
      salaryMonthly,
      months,
      releaseClause,
      signingBonus,
      status: "PENDING",
      message: offerData?.message || ""
    };

    // Sent (do usuário)
    mk.sentOffers.unshift(offer);
    mk.sentOffers = mk.sentOffers.slice(0, 80);

    // Inbox (time vendedor) ou auto-processa se free agent
    if (isFree) {
      // processa imediatamente (jogador decide)
      const ok = decideFreeAgentSigning(p, offer);
      if (!ok) {
        offer.status = "REJECTED";
        save();
        return { ok: false, msg: "Jogador recusou o contrato.", offer };
      }

      // aceita: aplica transferência (assinatura)
      const applied = applyAcceptedOffer(offer);
      offer.status = applied.ok ? "ACCEPTED" : "REJECTED";
      save();
      return applied.ok ? { ok: true, offer, applied } : { ok: false, msg: applied.msg || "Falha ao assinar.", offer };
    } else {
      // envia para inbox do vendedor
      const inbox = ensureInbox(sellerTeamId);
      inbox.unshift(offer);
      ensureInbox(sellerTeamId).splice(120); // cap
      save();
      news("Oferta enviada", `Você fez oferta por ${playerLabel(pid)} (Taxa ${fee.toFixed(2)} mi).`);
      return { ok: true, offer };
    }
  }

  function getInbox(teamId) {
    const inbox = ensureInbox(teamId);
    // só pending
    return inbox.filter(o => o && o.status === "PENDING").map(o => JSON.parse(JSON.stringify(o)));
  }

  function getSent(teamId) {
    const gs = ensureGS();
    const mk = gs.market;
    const tid = String(teamId || "");
    return mk.sentOffers
      .filter(o => String(o.fromTeamId) === tid)
      .map(o => JSON.parse(JSON.stringify(o)));
  }

  // -----------------------------
  // Accept / Reject (vendedor)
  // -----------------------------
  function acceptOffer(teamId, offerId) {
    const gs = ensureGS();
    const mk = gs.market;
    const tid = String(teamId || "");
    const inbox = ensureInbox(tid);

    const idx = inbox.findIndex(o => o && String(o.id) === String(offerId));
    if (idx < 0) return { ok: false, msg: "Oferta não encontrada." };

    const offer = inbox[idx];
    if (offer.status !== "PENDING") return { ok: false, msg: "Oferta já processada." };

    // verifica que o jogador ainda pertence ao time vendedor
    const p = getPlayerById(offer.playerId);
    if (!p) { offer.status = "EXPIRED"; save(); return { ok: false, msg: "Jogador não existe mais." }; }
    if (String(p.teamId) !== tid) { offer.status = "EXPIRED"; save(); return { ok: false, msg: "Jogador não está mais no clube." }; }

    // comprador consegue pagar salário? (FFP)
    if (!canAffordWage(offer.fromTeamId, offer.salaryMonthly)) {
      offer.status = "REJECTED";
      save();
      return { ok: false, msg: "Comprador estoura o FFP. Oferta rejeitada.", offer };
    }

    // decisão do clube vendedor (IA) — aqui como se o usuário aceitou manualmente
    offer.status = "ACCEPTED";

    const applied = applyAcceptedOffer(offer);
    if (!applied.ok) {
      offer.status = "REJECTED";
      save();
      return { ok: false, msg: applied.msg || "Falha ao aplicar.", offer };
    }

    save();
    return { ok: true, offer: JSON.parse(JSON.stringify(offer)), applied };
  }

  function rejectOffer(teamId, offerId) {
    const gs = ensureGS();
    const mk = gs.market;
    const tid = String(teamId || "");
    const inbox = ensureInbox(tid);

    const idx = inbox.findIndex(o => o && String(o.id) === String(offerId));
    if (idx < 0) return { ok: false, msg: "Oferta não encontrada." };

    const offer = inbox[idx];
    if (offer.status !== "PENDING") return { ok: false, msg: "Oferta já processada." };

    offer.status = "REJECTED";
    save();
    return { ok: true, offer: JSON.parse(JSON.stringify(offer)) };
  }

  // -----------------------------
  // Apply accepted offer: move player + set contract
  // -----------------------------
  function playerLabel(playerId) {
    const p = getPlayerById(playerId);
    return p ? (p.name || p.nome || `Jogador ${p.id}`) : `Jogador ${playerId}`;
  }

  function applyAcceptedOffer(offer) {
    const p = getPlayerById(offer.playerId);
    if (!p) return { ok: false, msg: "Jogador não encontrado." };

    const buyerId = String(offer.fromTeamId);
    const sellerId = offer.toTeamId ? String(offer.toTeamId) : null;

    // muda time do jogador
    p.teamId = buyerId;

    // contrato novo com Contracts
    if (window.Contracts && typeof Contracts.renew === "function") {
      try {
        // renew "reseta" contrato; funciona como contrato novo
        Contracts.renew(p.id, {
          months: offer.months,
          salaryMonthly: offer.salaryMonthly,
          releaseClause: offer.releaseClause,
          signingBonus: offer.signingBonus
        });
      } catch (e) {}
    } else if (window.Contracts && typeof Contracts.setPlayerContract === "function") {
      try {
        Contracts.setPlayerContract(p.id, {
          status: "ACTIVE",
          salaryMonthly: offer.salaryMonthly,
          monthsTotal: offer.months,
          releaseClause: offer.releaseClause,
          signingBonus: offer.signingBonus
        });
      } catch (e) {}
    }

    // notícias
    const buyerName = getTeamById(buyerId)?.name || buyerId;
    const sellerName = sellerId ? (getTeamById(sellerId)?.name || sellerId) : "Livre";
    const feeTxt = offer.type === "SIGNING" ? "Sem custo" : `${n(offer.fee, 0).toFixed(2)} mi`;

    news("Transferência concluída", `${playerLabel(p.id)} saiu de ${sellerName} para ${buyerName}. Taxa: ${feeTxt}.`);

    return { ok: true };
  }

  // -----------------------------
  // Free agent direct signing
  // -----------------------------
  function decideFreeAgentSigning(player, offer) {
    // chance baseada em salário vs sugerido, idade, ovr
    const want = suggestedSalary(player.id, offer.fromTeamId);
    const salary = n(offer.salaryMonthly, 0);

    let score = 0.52;
    if (salary >= want) score += 0.25;
    else score -= clamp((want - salary) / Math.max(want, 0.05), 0, 0.30);

    const ovr = getOVR(player);
    score += clamp((ovr - 60) / 200, -0.05, 0.08);

    // mais velho aceita mais rápido
    const age = getAge(player);
    if (age >= 30) score += 0.06;

    return rnd() < clamp(score, 0.20, 0.92);
  }

  function signFreeAgent(teamId, playerId, contractData) {
    const p = getPlayerById(playerId);
    if (!p) return { ok: false, msg: "Jogador não encontrado." };
    if (p.teamId) return { ok: false, msg: "Jogador não é free agent." };

    const offer = {
      id: uid(),
      iso: nowISO(),
      type: "SIGNING",
      fromTeamId: String(teamId),
      toTeamId: null,
      playerId: String(playerId),
      fee: 0,
      salaryMonthly: Number(clamp(n(contractData?.salaryMonthly, suggestedSalary(playerId, teamId)), 0.03, 50).toFixed(2)),
      months: clamp(n(contractData?.months, 24), 6, 60),
      releaseClause: Number(clamp(n(contractData?.releaseClause, playerValue(playerId) * 1.1), 0, 999).toFixed(2)),
      signingBonus: Number(clamp(n(contractData?.signingBonus, n(contractData?.salaryMonthly, 0) * 1.5), 0, 999).toFixed(2)),
      status: "PENDING",
      message: contractData?.message || ""
    };

    if (!canAffordWage(teamId, offer.salaryMonthly)) return { ok: false, msg: "FFP: salário estoura o teto." };

    const ok = decideFreeAgentSigning(p, offer);
    if (!ok) return { ok: false, msg: "Jogador recusou o contrato." };

    offer.status = "ACCEPTED";
    applyAcceptedOffer(offer);

    const gs = ensureGS();
    gs.market.sentOffers.unshift(offer);
    save();

    return { ok: true, offer };
  }

  // -----------------------------
  // AI Market tick
  // -----------------------------
  function aiPickBuyerTeams(excludeTeamId) {
    const teams = getTeams().filter(t => String(t.id) !== String(excludeTeamId));
    // prioriza Série A
    teams.sort((a, b) => {
      const da = String(a.division || a.serie || "A").toUpperCase() === "A" ? 1 : 0;
      const db = String(b.division || b.serie || "A").toUpperCase() === "A" ? 1 : 0;
      return db - da;
    });
    return teams.slice(0, 18);
  }

  function aiShouldBid(player) {
    const ovr = getOVR(player);
    const age = getAge(player);
    // alvo: 62+ e idade <= 30 (principalmente)
    let score = 0.10;
    if (ovr >= 68) score += 0.20;
    if (ovr >= 74) score += 0.18;
    if (age <= 24) score += 0.15;
    if (age >= 32) score -= 0.12;
    return rnd() < clamp(score, 0.03, 0.55);
  }

  function aiOfferForPlayer(buyerTeamId, player) {
    const val = playerValue(player.id);
    const sugW = suggestedSalary(player.id, buyerTeamId);

    // fee: 70%..120% do value
    const fee = Number(clamp(val * (0.70 + rnd() * 0.50), 0, 999).toFixed(2));
    const salary = Number(clamp(sugW * (0.90 + rnd() * 0.35), 0.03, 50).toFixed(2));
    const months = clamp(18 + Math.floor(rnd() * 24), 12, 60);
    const clause = Number(clamp(val * (1.10 + rnd() * 0.80), 0, 999).toFixed(2));
    const bonus = Number(clamp(salary * (1.0 + rnd() * 2.2), 0, 999).toFixed(2));

    if (!canAffordWage(buyerTeamId, salary)) return null;

    return {
      id: uid(),
      iso: nowISO(),
      type: player.teamId ? "TRANSFER" : "SIGNING",
      fromTeamId: String(buyerTeamId),
      toTeamId: player.teamId ? String(player.teamId) : null,
      playerId: String(player.id),
      fee: player.teamId ? fee : 0,
      salaryMonthly: salary,
      months,
      releaseClause: clause,
      signingBonus: bonus,
      status: "PENDING",
      message: "Proposta gerada pela IA do mercado."
    };
  }

  function aiProcessInboxForUserTeam(teamId) {
    // IA decide automaticamente propostas recebidas pelo usuário (opcional)
    // Aqui: NÃO auto-decide; deixa o usuário decidir na UI.
    // Mantemos apenas expiração leve.
    const gs = ensureGS();
    const inbox = ensureInbox(teamId);

    for (const o of inbox) {
      if (!o || o.status !== "PENDING") continue;
      // expira após muita “idade” (simplificado por contagem: se tiver > 30 ofertas pending, expira antigas)
    }

    if (inbox.length > 60) {
      // expira as mais antigas
      for (let i = inbox.length - 1; i >= 50; i--) {
        if (inbox[i] && inbox[i].status === "PENDING") inbox[i].status = "EXPIRED";
      }
    }
  }

  function tickAI() {
    const gs = ensureGS();
    const mk = gs.market;
    if (!mk.settings.aiEnabled) return { ok: false, msg: "AI desativada." };

    mk.lastTickISO = nowISO();

    const userTeamId = getUserTeamId();
    if (!userTeamId) return { ok: false, msg: "Sem time do usuário." };

    // cria contratos se existir Contracts
    try { if (window.Contracts && typeof Contracts.ensure === "function") Contracts.ensure(); } catch (e) {}

    // 1) IA compra jogadores do usuário (gera inbox pro usuário)
    const userPlayers = getTeamPlayers(userTeamId);
    const buyers = aiPickBuyerTeams(userTeamId);

    let created = 0;
    for (const p of userPlayers) {
      if (!aiShouldBid(p)) continue;
      const buyer = buyers[Math.floor(rnd() * buyers.length)];
      if (!buyer) continue;

      const offer = aiOfferForPlayer(buyer.id, p);
      if (!offer) continue;

      // não duplica ofertas da mesma equipe pro mesmo jogador
      const inbox = ensureInbox(userTeamId);
      const dup = inbox.some(o => o && o.status === "PENDING" && String(o.playerId) === String(p.id) && String(o.fromTeamId) === String(buyer.id));
      if (dup) continue;

      inbox.unshift(offer);
      created++;
      if (created >= 4) break;
    }

    // 2) IA assina free agents aleatoriamente (limpa mercado)
    const freeAgents = getPlayers().filter(p => !p.teamId);
    if (freeAgents.length) {
      // 0..2 por tick
      const signCount = Math.floor(rnd() * 3);
      for (let i = 0; i < signCount; i++) {
        const fa = freeAgents[Math.floor(rnd() * freeAgents.length)];
        if (!fa) continue;

        const buyer = buyers[Math.floor(rnd() * buyers.length)];
        if (!buyer) continue;

        if (!aiShouldBid(fa)) continue;

        const offer = aiOfferForPlayer(buyer.id, fa);
        if (!offer) continue;

        // jogador decide
        const ok = decideFreeAgentSigning(fa, offer);
        if (!ok) continue;

        offer.status = "ACCEPTED";
        applyAcceptedOffer(offer);

        mk.sentOffers.unshift(offer);
      }
    }

    // 3) Expiração + manutenção inbox
    aiProcessInboxForUserTeam(userTeamId);

    save();

    if (created > 0) {
      news("Mercado aquecido", `Você recebeu ${created} nova(s) proposta(s) por jogadores do seu elenco.`);
    }

    return { ok: true, createdOffers: created };
  }

  // -----------------------------
  // Auto-hook: se Training.applyWeek existir, roda IA junto
  // (sem quebrar, e sem modificar training.js)
  // -----------------------------
  function hookTrainingApplyWeek() {
    if (!window.Training || typeof Training.applyWeek !== "function") return;
    if (Training.applyWeek.__marketHooked) return;

    const original = Training.applyWeek.bind(Training);
    Training.applyWeek = function (teamId) {
      const res = original(teamId);
      try { tickAI(); } catch (e) {}
      return res;
    };
    Training.applyWeek.__marketHooked = true;
  }

  // tenta hook várias vezes
  setInterval(hookTrainingApplyWeek, 1200);

  // -----------------------------
  // Public API
  // -----------------------------
  window.Market = {
    ensure() { ensureGS(); try { hookTrainingApplyWeek(); } catch (e) {} },
    getPlayerValue: playerValue,
    getSuggestedSalary: suggestedSalary,
    toggleShortlist,
    getShortlist,
    makeOffer,
    getInbox,
    getSent,
    acceptOffer,
    rejectOffer,
    signFreeAgent,
    tickAI
  };
})();