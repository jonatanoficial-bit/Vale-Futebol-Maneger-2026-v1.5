/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/contracts.js — Contratos + Folha + FFP (AAA)
   -------------------------------------------------------
   O que entrega:
   - Estrutura robusta para contratos:
     • salário (mensal), duração (meses), data fim
     • multa/rescisão (release clause)
     • bônus (assinatura e por gol/assistência - placeholders)
     • status: ativo / rescindido / livre
   - Folha salarial + teto da folha (FFP simplificado)
   - Renovação, rescindir, liberar (free agent)
   - Avisos automáticos de FFP
   - Persistência em gameState.contracts

   Compatível com Database.players existente:
   - Se jogador não tiver contract, cria automaticamente
   - Salário padrão baseado em OVR (se existir)

   API:
   - Contracts.ensure()
   - Contracts.getPlayerContract(playerId)
   - Contracts.setPlayerContract(playerId, contract)
   - Contracts.getTeamContracts(teamId)
   - Contracts.getWageUsed(teamId)   // em milhões (mi) ou unidade local
   - Contracts.getWageCap(teamId)    // teto
   - Contracts.getFFPStatus(teamId)  // {cap, used, pct, level}
   - Contracts.renew(playerId, opts) // meses, salary, clause
   - Contracts.terminate(playerId, opts) // multa/pagamento
   - Contracts.release(playerId)     // torna free agent
   =======================================================*/

(function () {
  console.log("%c[Contracts] contracts.js carregado", "color:#60a5fa; font-weight:bold;");

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd() { return Math.random(); }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.seasonYear) gs.seasonYear = 2026;

    if (!gs.contracts || typeof gs.contracts !== "object") gs.contracts = {};
    const cs = gs.contracts;

    if (!cs.playerContracts || typeof cs.playerContracts !== "object") cs.playerContracts = {};
    if (!cs.teamCaps || typeof cs.teamCaps !== "object") cs.teamCaps = {}; // cap por time
    if (!cs.logs || !Array.isArray(cs.logs)) cs.logs = [];

    return gs;
  }

  function getPlayers() {
    return (window.Database && Array.isArray(Database.players)) ? Database.players : [];
  }
  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }
  function getPlayerById(id) {
    return getPlayers().find(p => String(p.id) === String(id)) || null;
  }
  function getTeamById(id) {
    return getTeams().find(t => String(t.id) === String(id)) || null;
  }
  function getTeamPlayers(teamId) {
    return getPlayers().filter(p => String(p.teamId) === String(teamId));
  }

  function save() {
    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}
  }
  function news(title, body) {
    try { if (window.News && typeof News.pushNews === "function") News.pushNews(title, body, "CONTRACTS"); } catch (e) {}
  }

  function nowYearMonth() {
    // simplificado: usa seasonYear e mês 1..12 baseado em "week" se existir
    const gs = ensureGS();
    const y = n(gs.seasonYear, 2026);
    let m = 1;
    if (gs.training && gs.training.week) {
      // 1..52 -> 1..12
      m = clamp(1 + Math.floor((n(gs.training.week, 1) - 1) / 4.3), 1, 12);
    }
    return { y, m };
  }

  // -----------------------------
  // Defaults: salário e contrato
  // -----------------------------
  function getOVR(p) { return n(p.ovr ?? p.overall, 60); }

  function baseSalaryFromOVR(ovr) {
    // em milhões / mês (mi)
    // 50 -> 0.08 | 60 -> 0.18 | 70 -> 0.45 | 80 -> 0.95 | 90 -> 1.80
    const x = clamp(n(ovr, 60), 40, 95);
    const scaled = Math.pow((x - 40) / 55, 2.0); // 0..1
    return Number((0.06 + scaled * 1.85).toFixed(2));
  }

  function defaultContractForPlayer(p) {
    const ovr = getOVR(p);
    const salary = baseSalaryFromOVR(ovr);

    // duração: jovens mais longos
    const age = n(p.age, 24);
    const months =
      age <= 20 ? 48 :
      age <= 24 ? 36 :
      age <= 29 ? 30 :
      age <= 33 ? 24 : 18;

    // multa: 8..30x salário (aprox)
    const clause = Number((salary * (8 + Math.floor(rnd() * 16))).toFixed(2));

    const { y, m } = nowYearMonth();
    const endMonth = m + months;
    const endY = y + Math.floor((endMonth - 1) / 12);
    const endM = ((endMonth - 1) % 12) + 1;

    return {
      status: "ACTIVE",        // ACTIVE | TERMINATED | FREE
      salaryMonthly: salary,   // mi/mês
      monthsTotal: months,
      startYear: y,
      startMonth: m,
      endYear: endY,
      endMonth: endM,
      releaseClause: clause,   // mi
      signingBonus: Number((salary * (1 + rnd() * 2)).toFixed(2)), // mi
      lastRenewISO: null
    };
  }

  // -----------------------------
  // Cap da folha por time (FFP)
  // -----------------------------
  function defaultCapForTeam(teamId) {
    const t = getTeamById(teamId);
    const div = String(t?.division || t?.serie || "A").toUpperCase();

    // cap em mi/mês (ajuste conforme seu jogo)
    // Série A maior, Série B menor
    const cap =
      div === "A" ? 14.0 :
      div === "B" ? 6.5 :
      4.0;

    // clubes grandes podem ter + um pouco (se existir "reputation" / "budget")
    const rep = n(t?.reputation || t?.prestige || 50, 50);
    const bonus = clamp((rep - 50) / 100, -0.15, 0.35); // -15%..+35%
    return Number((cap * (1 + bonus)).toFixed(2));
  }

  function getWageCap(teamId) {
    const gs = ensureGS();
    const cs = gs.contracts;
    const tid = String(teamId);

    if (cs.teamCaps[tid] == null) cs.teamCaps[tid] = defaultCapForTeam(tid);
    return n(cs.teamCaps[tid], defaultCapForTeam(tid));
  }

  function setWageCap(teamId, cap) {
    const gs = ensureGS();
    const cs = gs.contracts;
    const tid = String(teamId);
    cs.teamCaps[tid] = Number(clamp(n(cap, getWageCap(tid)), 0, 999).toFixed(2));
    save();
    return cs.teamCaps[tid];
  }

  // -----------------------------
  // Contract CRUD
  // -----------------------------
  function ensureContract(playerId) {
    const gs = ensureGS();
    const cs = gs.contracts;
    const pid = String(playerId);

    if (!cs.playerContracts[pid]) {
      const p = getPlayerById(pid);
      cs.playerContracts[pid] = p ? defaultContractForPlayer(p) : {
        status: "ACTIVE",
        salaryMonthly: 0.10,
        monthsTotal: 24,
        startYear: gs.seasonYear,
        startMonth: 1,
        endYear: gs.seasonYear + 2,
        endMonth: 1,
        releaseClause: 1.0,
        signingBonus: 0.2,
        lastRenewISO: null
      };
    }

    const c = cs.playerContracts[pid];
    // normaliza
    c.status = String(c.status || "ACTIVE").toUpperCase();
    c.salaryMonthly = Number(clamp(n(c.salaryMonthly, 0.1), 0, 50).toFixed(2));
    c.releaseClause = Number(clamp(n(c.releaseClause, 0.5), 0, 999).toFixed(2));
    c.monthsTotal = clamp(n(c.monthsTotal, 24), 1, 120);

    if (!c.startYear) c.startYear = gs.seasonYear;
    if (!c.startMonth) c.startMonth = 1;
    if (!c.endYear) c.endYear = gs.seasonYear + 2;
    if (!c.endMonth) c.endMonth = 1;

    return c;
  }

  function getPlayerContract(playerId) {
    const c = ensureContract(playerId);
    return JSON.parse(JSON.stringify(c));
  }

  function setPlayerContract(playerId, contract) {
    const gs = ensureGS();
    const cs = gs.contracts;
    const pid = String(playerId);
    cs.playerContracts[pid] = Object.assign(ensureContract(pid), contract || {});
    save();
    return getPlayerContract(pid);
  }

  function getTeamContracts(teamId) {
    const tid = String(teamId);
    const players = getTeamPlayers(tid);
    const res = players.map(p => {
      const c = ensureContract(p.id);
      return {
        playerId: p.id,
        name: p.name || p.nome || `Jogador ${p.id}`,
        ovr: n(p.ovr ?? p.overall, 60),
        age: n(p.age, 24),
        contract: JSON.parse(JSON.stringify(c))
      };
    });

    // ordena por salário desc
    res.sort((a, b) => n(b.contract.salaryMonthly, 0) - n(a.contract.salaryMonthly, 0));
    return res;
  }

  // -----------------------------
  // Folha e FFP status
  // -----------------------------
  function getWageUsed(teamId) {
    const players = getTeamPlayers(teamId);
    let total = 0;
    for (const p of players) {
      const c = ensureContract(p.id);
      if (String(c.status).toUpperCase() !== "ACTIVE") continue;
      total += n(c.salaryMonthly, 0);
    }
    return Number(total.toFixed(2));
  }

  function getFFPStatus(teamId) {
    const cap = getWageCap(teamId);
    const used = getWageUsed(teamId);
    const pct = cap > 0 ? (used / cap) * 100 : 0;

    let level = "OK";
    if (pct >= 95) level = "OVER";
    else if (pct >= 75) level = "WARN";

    return {
      cap: Number(cap.toFixed(2)),
      used: Number(used.toFixed(2)),
      pct: Number(pct.toFixed(1)),
      level
    };
  }

  function pushLog(type, payload) {
    const gs = ensureGS();
    const cs = gs.contracts;
    cs.logs.unshift({ iso: new Date().toISOString(), type, payload });
    cs.logs = cs.logs.slice(0, 40);
  }

  // -----------------------------
  // Ações: renovar / rescindir / liberar
  // -----------------------------
  function renew(playerId, opts) {
    const gs = ensureGS();
    const pid = String(playerId);
    const p = getPlayerById(pid);
    if (!p) return { ok: false, msg: "Jogador não encontrado." };

    const c = ensureContract(pid);
    if (c.status !== "ACTIVE") return { ok: false, msg: "Contrato não está ativo." };

    const addMonths = clamp(n(opts?.months, 24), 6, 60);
    const newSalary = Number(clamp(n(opts?.salaryMonthly, c.salaryMonthly), 0.05, 50).toFixed(2));
    const newClause = Number(clamp(n(opts?.releaseClause, c.releaseClause), 0, 999).toFixed(2));
    const bonus = Number(clamp(n(opts?.signingBonus, c.signingBonus), 0, 999).toFixed(2));

    // atualiza fim do contrato baseado no mês/ano atual
    const { y, m } = nowYearMonth();
    c.startYear = y;
    c.startMonth = m;

    const endMonth = m + addMonths;
    c.endYear = y + Math.floor((endMonth - 1) / 12);
    c.endMonth = ((endMonth - 1) % 12) + 1;

    c.monthsTotal = addMonths;
    c.salaryMonthly = newSalary;
    c.releaseClause = newClause;
    c.signingBonus = bonus;
    c.lastRenewISO = new Date().toISOString();

    pushLog("RENEW", { playerId: pid, months: addMonths, salaryMonthly: newSalary, releaseClause: newClause });

    const name = p.name || p.nome || `Jogador ${pid}`;
    news("Renovação", `${name} renovou por ${addMonths} meses. Salário: ${newSalary.toFixed(2)} mi/mês.`);
    save();

    // alerta FFP
    const ffp = getFFPStatus(p.teamId);
    if (ffp.level !== "OK") {
      news("Aviso FFP", `Folha salarial: ${ffp.used.toFixed(2)} / ${ffp.cap.toFixed(2)} mi (${ffp.pct}%).`);
    }

    return { ok: true, contract: getPlayerContract(pid), ffp };
  }

  function terminate(playerId, opts) {
    const gs = ensureGS();
    const pid = String(playerId);
    const p = getPlayerById(pid);
    if (!p) return { ok: false, msg: "Jogador não encontrado." };

    const c = ensureContract(pid);
    if (c.status !== "ACTIVE") return { ok: false, msg: "Contrato já não está ativo." };

    // multa: por padrão 2 meses de salário ou 10% da cláusula (o maior)
    const salary = n(c.salaryMonthly, 0);
    const fee = Number(Math.max(salary * 2, n(c.releaseClause, 0) * 0.10).toFixed(2));

    c.status = "TERMINATED";

    pushLog("TERMINATE", { playerId: pid, fee });

    const name = p.name || p.nome || `Jogador ${pid}`;
    news("Rescisão", `${name} teve o contrato rescindido. Multa estimada: ${fee.toFixed(2)} mi.`);
    save();

    return { ok: true, fee, contract: getPlayerContract(pid) };
  }

  function release(playerId) {
    const pid = String(playerId);
    const p = getPlayerById(pid);
    if (!p) return { ok: false, msg: "Jogador não encontrado." };

    const c = ensureContract(pid);
    c.status = "FREE";

    // torna free agent (sem time)
    p.teamId = null;

    pushLog("RELEASE", { playerId: pid });

    const name = p.name || p.nome || `Jogador ${pid}`;
    news("Dispensa", `${name} foi liberado e está livre no mercado.`);
    save();

    return { ok: true, contract: getPlayerContract(pid) };
  }

  // -----------------------------
  // Ensure
  // -----------------------------
  function ensure() {
    ensureGS();
    // cria contratos para todos rapidamente (não pesado)
    const players = getPlayers();
    for (let i = 0; i < players.length; i++) {
      ensureContract(players[i].id);
    }
    // cria caps para times
    const teams = getTeams();
    const gs = ensureGS();
    const cs = gs.contracts;
    for (let i = 0; i < teams.length; i++) {
      const tid = String(teams[i].id);
      if (cs.teamCaps[tid] == null) cs.teamCaps[tid] = defaultCapForTeam(tid);
    }
    save();
  }

  // -----------------------------
  // Public API
  // -----------------------------
  window.Contracts = {
    ensure,
    getPlayerContract,
    setPlayerContract,
    getTeamContracts,
    getWageUsed,
    getWageCap,
    setWageCap,
    getFFPStatus,
    renew,
    terminate,
    release
  };
})();