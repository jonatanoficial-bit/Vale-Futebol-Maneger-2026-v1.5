import { rosterStats } from "../roster/rosterService.js";

function nowIso() {
  const d = new Date();
  return d.toISOString();
}

function monthKeyFromIsoDate(dateIso) {
  const [y, m] = String(dateIso).split("-");
  return `${y}-${m}`;
}

export function ensureEconomy(state, pack) {
  const next = structuredClone(state);

  if (!next.career) next.career = {};
  if (!next.career.economy) {
    // saldo inicial (MVP)
    next.career.economy = {
      balance: 15_000_000,
      sponsor: { name: "Vale Bank (MVP)", monthly: 1_250_000 },
      lastSponsorMonth: null,
      lastMatchIncome: 0,
      ledger: []
    };
  }

  if (!next.career.roster) {
    next.career.roster = {
      signedPlayers: [],
      releasedIds: [],
      transactions: []
    };
  }

  return next;
}

export function addLedger(state, entry) {
  const next = structuredClone(state);
  const e = next.career.economy;
  e.ledger.unshift({
    id: `L_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    at: nowIso(),
    ...entry
  });
  if (e.ledger.length > 120) e.ledger = e.ledger.slice(0, 120);
  return next;
}

export function credit(state, amount, reason, meta = {}) {
  const next = structuredClone(state);
  next.career.economy.balance += amount;
  return addLedger(next, { type: "CREDIT", amount, reason, meta });
}

export function debit(state, amount, reason, meta = {}) {
  const next = structuredClone(state);
  next.career.economy.balance -= amount;
  return addLedger(next, { type: "DEBIT", amount, reason, meta });
}

export function applyMonthlySponsorIfNeeded(state, currentDateIso) {
  const monthKey = monthKeyFromIsoDate(currentDateIso);
  const next = structuredClone(state);
  const eco = next.career.economy;

  if (eco.lastSponsorMonth === monthKey) return next;

  eco.lastSponsorMonth = monthKey;
  const amt = eco.sponsor?.monthly || 0;
  if (amt > 0) {
    return credit(next, amt, "Patrocínio mensal", { month: monthKey, sponsor: eco.sponsor?.name });
  }
  return next;
}

export function estimateMatchIncome({ competitionId, isHome, homeGoals, awayGoals }) {
  // receita de jogo (MVP) – simples e “realista”:
  // base por competição + bônus por gols + mando
  let base = 250_000;

  if (String(competitionId).startsWith("BR-A")) base = 650_000;
  else if (String(competitionId).startsWith("BR-B")) base = 420_000;
  else if (String(competitionId).startsWith("BR-C")) base = 280_000;
  else if (String(competitionId).startsWith("BR-CDB")) base = 520_000;
  else if (String(competitionId).startsWith("CONMEBOL-LIB")) base = 900_000;
  else if (String(competitionId).startsWith("CONMEBOL-SULA")) base = 650_000;
  else if (String(competitionId).startsWith("WORLD-INTER")) base = 1_500_000;
  else if (String(competitionId).startsWith("BR-SUPERCOPA")) base = 800_000;
  else if (String(competitionId).startsWith("BR-EST")) base = 200_000;

  const goals = (homeGoals || 0) + (awayGoals || 0);
  const goalBonus = goals * 35_000;

  const homeBonus = isHome ? base * 0.25 : 0;
  const total = Math.round(base + goalBonus + homeBonus);
  return total;
}

export function applyMatchEconomy({ state, match, fixture }) {
  // aplica receita de jogo SOMENTE se o usuário estiver no jogo
  const next = structuredClone(state);
  const userClubId = next.career.clubId;

  const involved = match.homeId === userClubId || match.awayId === userClubId;
  if (!involved) return next;

  const isHome = match.homeId === userClubId;
  const income = estimateMatchIncome({
    competitionId: fixture.competitionId,
    isHome,
    homeGoals: match.homeGoals,
    awayGoals: match.awayGoals
  });

  next.career.economy.lastMatchIncome = income;
  const afterSponsor = applyMonthlySponsorIfNeeded(next, fixture.date);

  return credit(afterSponsor, income, "Receita de jogo", {
    competitionId: fixture.competitionId,
    date: fixture.date,
    homeId: match.homeId,
    awayId: match.awayId,
    score: `${match.homeGoals}-${match.awayGoals}`
  });
}

export function computeWageBillFromSquad(squad) {
  const stats = rosterStats(squad);
  return stats.wage;
}