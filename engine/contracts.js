/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/contracts.js — Contratos + Salários + Folha
   -------------------------------------------------------
   - NÃO altera database.js
   - Persiste em gameState:
     gameState.contracts.player[PLAYER_ID] = { salary, monthsLeft }
     gameState.clubFinance[TEAM_ID] = { wageBudget, wageUsed, balance }
     gameState.financeClock = { userMatchCount }

   Regras:
   - salary em "milhões por mês" (ex: 0.35 = 350k/mês)
   - desconto de salários: a cada 4 jogos do usuário (simula 1 mês)
   - compra no mercado valida: saldo + orçamento de folha
   =======================================================*/

(function () {
  console.log("%c[Contracts] contracts.js carregado", "color:#22c55e; font-weight:bold;");

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }

  function ensureGameState() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;

    if (!gs.contracts || typeof gs.contracts !== "object") gs.contracts = {};
    if (!gs.contracts.player || typeof gs.contracts.player !== "object") gs.contracts.player = {};

    if (!gs.clubFinance || typeof gs.clubFinance !== "object") gs.clubFinance = {};

    if (!gs.financeClock || typeof gs.financeClock !== "object") gs.financeClock = {};
    if (typeof gs.financeClock.userMatchCount !== "number") gs.financeClock.userMatchCount = 0;

    if (typeof gs.balance !== "number") gs.balance = 50; // fallback (milhões)
    return gs;
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

  function getUserTeamId() {
    const gs = ensureGameState();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  function getDivisionByTeamId(teamId) {
    const t = getTeamsArray().find(x => x.id === teamId);
    return (t && (t.division || t.serie || t.league)) ? String(t.division || t.serie || t.league) : "A";
  }

  // Estimativa de salário (milhões/mês) baseada em overall e value (milhões)
  function estimateSalary(player) {
    const ovr = n(player?.overall ?? player?.ovr, 70);
    const val = n(player?.value, 3);

    // Base por overall + leve peso por valor de mercado
    // Ajuste para caber em clubes com saldo ~50mi.
    let s = 0.05 + (ovr - 60) * 0.012 + val * 0.008; // milhões/mês
    s = clamp(s, 0.05, 2.80);

    // Arredonda em 0.01 (10k)
    return Math.round(s * 100) / 100;
  }

  // Estimativa de meses de contrato (6 a 36)
  function estimateMonthsLeft(player) {
    const age = n(player?.age, 27);
    // mais velho tende a ter contrato menor
    const base = age >= 32 ? 12 : (age >= 28 ? 18 : 24);
    const wobble = Math.floor(Math.random() * 13) - 6; // -6..+6
    return clamp(base + wobble, 6, 36);
  }

  function ensurePlayerContract(playerId, playerObjOptional) {
    const gs = ensureGameState();
    const pid = String(playerId || "");
    if (!pid) return null;

    if (!gs.contracts.player[pid]) {
      const p = playerObjOptional || getPlayersArray().find(x => String(x.id) === pid) || null;
      gs.contracts.player[pid] = {
        salary: estimateSalary(p),
        monthsLeft: estimateMonthsLeft(p)
      };
    }

    // sane
    const c = gs.contracts.player[pid];
    c.salary = clamp(n(c.salary, 0.10), 0.01, 20);
    c.monthsLeft = clamp(Math.floor(n(c.monthsLeft, 24)), 0, 120);
    return c;
  }

  function getPlayerContract(playerId) {
    const gs = ensureGameState();
    const pid = String(playerId || "");
    if (!pid) return null;
    return gs.contracts.player[pid] || null;
  }

  function setPlayerContract(playerId, salary, monthsLeft) {
    const gs = ensureGameState();
    const pid = String(playerId || "");
    if (!pid) return null;
    gs.contracts.player[pid] = {
      salary: clamp(n(salary, 0.10), 0.01, 20),
      monthsLeft: clamp(Math.floor(n(monthsLeft, 24)), 0, 120)
    };
    return gs.contracts.player[pid];
  }

  function estimateWageBudgetForClub(teamId) {
    // orçamento mensal (milhões/mês)
    const div = getDivisionByTeamId(teamId);
    // Série A costuma ter folha maior
    if (String(div).toUpperCase() === "A") return 12.0; // 12 mi/mês
    return 6.5; // Série B
  }

  function ensureClubFinance(teamId) {
    const gs = ensureGameState();
    const id = String(teamId || "");
    if (!id) return null;

    if (!gs.clubFinance[id]) {
      gs.clubFinance[id] = {
        wageBudget: estimateWageBudgetForClub(id),
        wageUsed: 0,
        balance: null // se for o clube do usuário, usamos gs.balance como fonte real
      };
    }

    const cf = gs.clubFinance[id];
    cf.wageBudget = clamp(n(cf.wageBudget, estimateWageBudgetForClub(id)), 0.5, 1000);
    cf.wageUsed = clamp(n(cf.wageUsed, 0), 0, 1000);
    if (cf.balance != null) cf.balance = clamp(n(cf.balance, 0), -9999, 999999);

    return cf;
  }

  function recalcWageUsed(teamId) {
    const gs = ensureGameState();
    const id = String(teamId || "");
    if (!id) return 0;

    ensureClubFinance(id);

    const elenco = getPlayersArray().filter(p => String(p.teamId) === id);
    let sum = 0;
    for (const p of elenco) {
      const c = ensurePlayerContract(p.id, p);
      sum += n(c?.salary, 0);
    }

    sum = Math.round(sum * 100) / 100;
    gs.clubFinance[id].wageUsed = sum;
    return sum;
  }

  function getClubFinance(teamId) {
    const cf = ensureClubFinance(teamId);
    if (!cf) return null;

    // Mantém balance real do usuário ligado em gameState.balance
    const gs = ensureGameState();
    const user = getUserTeamId();
    if (user && String(user) === String(teamId)) {
      return {
        wageBudget: cf.wageBudget,
        wageUsed: cf.wageUsed,
        balance: n(gs.balance, 0)
      };
    }

    return cf;
  }

  function canAffordTransfer(teamId, fee) {
    const gs = ensureGameState();
    const user = getUserTeamId();
    if (!user || String(user) !== String(teamId)) return true; // simplificado: IA sempre consegue

    return n(gs.balance, 0) >= n(fee, 0);
  }

  function canAffordWages(teamId, addedSalary) {
    const cf = getClubFinance(teamId);
    if (!cf) return true;

    // Para IA, simplificado
    const user = getUserTeamId();
    if (!user || String(user) !== String(teamId)) return true;

    const used = n(cf.wageUsed, 0);
    const bud = n(cf.wageBudget, 0);
    return (used + n(addedSalary, 0)) <= bud;
  }

  function payMonthlyWagesForTeam(teamId) {
    const gs = ensureGameState();
    const id = String(teamId || "");
    if (!id) return false;

    const user = getUserTeamId();
    // Só cobra automaticamente do usuário (AAA e simples). IA pode ser expandida depois.
    if (!user || String(user) !== id) return false;

    recalcWageUsed(id);
    const cf = ensureClubFinance(id);
    const wage = n(cf.wageUsed, 0);

    gs.balance = Math.round((n(gs.balance, 0) - wage) * 100) / 100;

    // decrementa 1 mês de contrato do elenco do usuário
    const elenco = getPlayersArray().filter(p => String(p.teamId) === id);
    for (const p of elenco) {
      const c = ensurePlayerContract(p.id, p);
      c.monthsLeft = Math.max(0, Math.floor(n(c.monthsLeft, 0) - 1));
    }

    return true;
  }

  // Chamado ao fim do jogo do usuário: a cada 4 jogos = 1 mês
  function onUserMatchFinished() {
    const gs = ensureGameState();
    gs.financeClock.userMatchCount += 1;

    // A cada 4 jogos do usuário, desconta 1 mês de salários
    if (gs.financeClock.userMatchCount % 4 === 0) {
      const teamId = getUserTeamId();
      if (teamId) {
        const ok = payMonthlyWagesForTeam(teamId);
        try {
          if (ok && window.News && typeof News.pushNews === "function") {
            const cf = getClubFinance(teamId);
            News.pushNews(
              "Folha salarial paga",
              `Salários do mês debitados: ${n(cf?.wageUsed, 0).toFixed(2)} mi. Saldo atual: ${n(gs.balance, 0).toFixed(1)} mi.`,
              "FINANCE"
            );
          }
        } catch (e) {}
      }
    }
  }

  function ensureAll() {
    const gs = ensureGameState();

    // garante contratos para todos
    const ps = getPlayersArray();
    for (const p of ps) ensurePlayerContract(p.id, p);

    // garante finanças para todos os clubes e recalcula folhas
    const ts = getTeamsArray();
    for (const t of ts) {
      ensureClubFinance(t.id);
      recalcWageUsed(t.id);
    }

    // garante vínculo de saldo no usuário
    const user = getUserTeamId();
    if (user) ensureClubFinance(user);

    return gs;
  }

  window.Contracts = {
    ensure: ensureAll,
    ensurePlayerContract,
    getPlayerContract,
    setPlayerContract,
    ensureClubFinance,
    getClubFinance,
    recalcWageUsed,
    canAffordTransfer,
    canAffordWages,
    onUserMatchFinished,
    estimateSalary
  };
})();