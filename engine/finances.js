/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/finances.js — Finanças, Folha & FFP (AAA core)
   -------------------------------------------------------
   Objetivos:
   - Controle de CAIXA (saldo), FOLHA (salários) e LIMITE
   - Regras simples de Fair Play Financeiro (FFP)
   - API usada pela UI do Mercado

   NÃO depende de frameworks.
   Funciona mesmo se outros módulos não existirem.

   Dados:
   - usa window.gameState
   - usa Database.teams / Database.players (se disponível)

   API pública:
   - Finances.ensure()
   - Finances.getClub(teamId)
   - Finances.getPayroll(teamId)
   - Finances.getPayrollLimit(teamId)
   - Finances.getFFP(teamId)
   - Finances.canAffordOffer(teamId, offer)
   - Finances.applyTransfer(teamId, offer)   // compra
   - Finances.applySale(teamId, offer)       // venda
   - Finances.formatMoney(n)
   =======================================================*/

(function () {
  console.log("%c[Finances] finances.js carregado", "color:#60a5fa; font-weight:bold;");

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.seasonYear) gs.seasonYear = 2026;
    if (!gs.finances) gs.finances = {};
    if (!gs.finances.clubs) gs.finances.clubs = {};
    if (!gs.finances.ffpBySeason) gs.finances.ffpBySeason = {};
    return gs;
  }

  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function getTeams() {
    try { return (window.Database && Array.isArray(Database.teams)) ? Database.teams : []; }
    catch (e) { return []; }
  }
  function getPlayers() {
    try { return (window.Database && Array.isArray(Database.players)) ? Database.players : []; }
    catch (e) { return []; }
  }

  function getTeam(teamId) {
    return getTeams().find(t => String(t.id) === String(teamId)) || null;
  }

  function getPlayersByTeam(teamId) {
    return getPlayers().filter(p => String(p.teamId) === String(teamId));
  }

  function getPlayerSalary(p) {
    // tenta campos comuns
    return n(p?.salary ?? p?.wage ?? p?.salario ?? p?.weeklyWage ?? 0, 0);
  }

  function getPlayerValue(p) {
    // valor de mercado (transfer fee)
    return n(p?.value ?? p?.valor ?? p?.marketValue ?? p?.price ?? 0, 0);
  }

  function inferTier(team) {
    // Série / divisão
    const d = String(team?.division ?? team?.serie ?? "A").toUpperCase();
    return (d.includes("B")) ? "B" : "A";
  }

  function defaultClubProfile(team) {
    // Valores base (em "milhões" ou "unidade monetária" do jogo)
    // Ajuste fino depois, mas já deixa o manager vivo agora.
    const tier = inferTier(team);
    const baseCash = (tier === "A") ? 120 : 55;     // caixa inicial
    const payrollLimit = (tier === "A") ? 28 : 12;  // limite de folha (mês) em "mi"
    const seasonBudget = (tier === "A") ? 160 : 75; // referência para FFP

    // dá bônus leve para clubes grandes, se houver rating
    const rep = n(team?.reputation ?? team?.rep ?? team?.rating ?? 70, 70);
    const factor = clamp((rep - 60) / 60, 0, 1); // 0..1

    return {
      cash: Math.round(baseCash * (0.90 + 0.35 * factor)),
      payrollLimit: Math.round(payrollLimit * (0.90 + 0.35 * factor)),
      seasonBudget: Math.round(seasonBudget * (0.90 + 0.35 * factor))
    };
  }

  function ensureClub(teamId) {
    const gs = ensureGS();
    const id = String(teamId);
    if (!gs.finances.clubs[id]) {
      const team = getTeam(teamId) || {};
      const prof = defaultClubProfile(team);
      gs.finances.clubs[id] = {
        teamId: id,
        cash: prof.cash,                // saldo do clube (mi)
        payrollLimit: prof.payrollLimit,// limite mensal da folha (mi)
        updatedAt: Date.now()
      };
    }
    return gs.finances.clubs[id];
  }

  function ensureFFP(teamId, seasonYear) {
    const gs = ensureGS();
    const y = String(seasonYear || gs.seasonYear || 2026);
    const id = String(teamId);
    if (!gs.finances.ffpBySeason[y]) gs.finances.ffpBySeason[y] = {};
    if (!gs.finances.ffpBySeason[y][id]) {
      const team = getTeam(teamId) || {};
      const prof = defaultClubProfile(team);
      gs.finances.ffpBySeason[y][id] = {
        season: y,
        teamId: id,
        // fluxo simples
        transferSpent: 0,
        transferIncome: 0,
        wageSpent: 0,       // acumulado da temporada (aprox)
        prizeIncome: 0,
        sponsorIncome: Math.round(prof.seasonBudget * 0.55),
        ticketIncome: Math.round(prof.seasonBudget * 0.25),
        otherIncome: Math.round(prof.seasonBudget * 0.10),
        otherCosts: Math.round(prof.seasonBudget * 0.15)
      };
    }
    return gs.finances.ffpBySeason[y][id];
  }

  function persist() {
    // salva leve — não quebra se Save não existir
    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}
    try { localStorage.setItem("vfm-save", JSON.stringify(window.gameState)); } catch (e) {}
  }

  function getPayroll(teamId) {
    const players = getPlayersByTeam(teamId);
    let sum = 0;
    for (const p of players) sum += getPlayerSalary(p);
    // salário base vem provavelmente em "mi/mês" ou "unidade" do seu DB.
    // a UI só precisa comparar com o limite.
    return Math.round(sum * 100) / 100;
  }

  function getPayrollLimit(teamId) {
    const club = ensureClub(teamId);
    return n(club.payrollLimit, 0);
  }

  function formatMoney(v) {
    const x = n(v, 0);
    // mostra em "mi" com 2 casas
    return `${x.toFixed(2)} mi`;
  }

  function getClub(teamId) {
    const club = ensureClub(teamId);
    return {
      ...club,
      payroll: getPayroll(teamId),
      payrollLimit: getPayrollLimit(teamId)
    };
  }

  function getFFP(teamId) {
    const gs = ensureGS();
    const f = ensureFFP(teamId, gs.seasonYear);
    const income = n(f.transferIncome) + n(f.prizeIncome) + n(f.sponsorIncome) + n(f.ticketIncome) + n(f.otherIncome);
    const costs = n(f.transferSpent) + n(f.wageSpent) + n(f.otherCosts);
    const net = income - costs; // positivo = saudável
    return { ...f, income, costs, net };
  }

  // Oferta padrão:
  // offer = { playerId, toTeamId, fromTeamId, fee, salary, contractMonths }
  function canAffordOffer(teamId, offer) {
    const club = ensureClub(teamId);
    const cash = n(club.cash, 0);

    const fee = n(offer?.fee, 0);
    const salary = n(offer?.salary, 0);

    // checagem de caixa para taxa
    const cashOk = cash >= fee;

    // checagem de folha
    const payroll = getPayroll(teamId);
    const limit = getPayrollLimit(teamId);
    const payrollOk = (payroll + salary) <= limit;

    // checagem FFP (simplificado): não deixar net cair demais
    const ffp = getFFP(teamId);
    // tolerância: pode fechar a temporada até -15% do orçamento (ajuste depois)
    const tolerance = Math.max(8, n(getTeam(teamId)?.ffpTolerance ?? 10, 10));
    const projectedNet = (ffp.net - fee - (salary * 10)); // salário pesa na temporada (aprox)
    const ffpOk = projectedNet >= -tolerance;

    return {
      cashOk, payrollOk, ffpOk,
      projected: { payroll: payroll + salary, payrollLimit: limit, cashAfter: cash - fee, projectedFFPNet: projectedNet }
    };
  }

  function applyTransfer(teamId, offer) {
    // compra: tira fee do caixa e adiciona wageSpent/transferSpent
    const gs = ensureGS();
    const club = ensureClub(teamId);
    const f = ensureFFP(teamId, gs.seasonYear);

    const fee = n(offer?.fee, 0);
    const salary = n(offer?.salary, 0);

    club.cash = Math.round((n(club.cash, 0) - fee) * 100) / 100;
    f.transferSpent = Math.round((n(f.transferSpent, 0) + fee) * 100) / 100;
    // salário acumulado simplificado (10 meses por temporada)
    f.wageSpent = Math.round((n(f.wageSpent, 0) + salary * 10) * 100) / 100;

    club.updatedAt = Date.now();
    persist();
    return getClub(teamId);
  }

  function applySale(teamId, offer) {
    // venda: entra fee no caixa e soma transferIncome; alivia wageSpent de forma simples
    const gs = ensureGS();
    const club = ensureClub(teamId);
    const f = ensureFFP(teamId, gs.seasonYear);

    const fee = n(offer?.fee, 0);
    const salary = n(offer?.salary, 0);

    club.cash = Math.round((n(club.cash, 0) + fee) * 100) / 100;
    f.transferIncome = Math.round((n(f.transferIncome, 0) + fee) * 100) / 100;
    // remove parte do salário acumulado (10 meses)
    f.wageSpent = Math.round(Math.max(0, n(f.wageSpent, 0) - salary * 10) * 100) / 100;

    club.updatedAt = Date.now();
    persist();
    return getClub(teamId);
  }

  function ensure() {
    const gs = ensureGS();
    // nada obrigatório aqui, mas garante que exista ao abrir UI
    return gs.finances;
  }

  window.Finances = {
    ensure,
    getClub,
    getPayroll,
    getPayrollLimit,
    getFFP,
    canAffordOffer,
    applyTransfer,
    applySale,
    formatMoney
  };
})();