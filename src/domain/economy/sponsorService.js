function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function monthKey(isoDate) {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function ensureEconomyState(state) {
  const next = structuredClone(state);
  if (!next.career) next.career = {};
  if (!next.career.economy) {
    next.career.economy = {
      balance: 15_000_000,
      sponsor: { name: "Vale Bank (MVP)", monthly: 1_250_000, perfBonus: 75_000 },
      lastSponsorMonth: null,
      lastMatchIncome: 0,
      ledger: [],
      wageMonthlyEstimate: 0
    };
  } else {
    const e = next.career.economy;
    if (typeof e.balance !== "number") e.balance = 15_000_000;
    if (!e.sponsor) e.sponsor = { name: "Vale Bank (MVP)", monthly: 1_250_000, perfBonus: 75_000 };
    if (typeof e.sponsor.monthly !== "number") e.sponsor.monthly = 1_250_000;
    if (typeof e.sponsor.perfBonus !== "number") e.sponsor.perfBonus = 75_000;
    if (!("lastSponsorMonth" in e)) e.lastSponsorMonth = null;
    if (!Array.isArray(e.ledger)) e.ledger = [];
    if (!("wageMonthlyEstimate" in e)) e.wageMonthlyEstimate = 0;
  }
  return next;
}

export function postLedger(state, entry) {
  const next = structuredClone(state);
  const e = next.career.economy;
  e.ledger.unshift({
    at: new Date().toISOString(),
    ...entry
  });
  e.ledger = e.ledger.slice(0, 250);
  return next;
}

export function applyMonthlySponsorIfNeeded(state, isoDate, performanceScore = 0) {
  let next = ensureEconomyState(state);
  const e = next.career.economy;
  const mk = monthKey(isoDate || new Date().toISOString());
  if (!mk) return next;

  if (e.lastSponsorMonth === mk) return next;

  const base = e.sponsor.monthly || 0;
  const bonus = clamp(Math.round((e.sponsor.perfBonus || 0) * performanceScore), 0, 1_000_000);

  e.balance += base + bonus;
  e.lastSponsorMonth = mk;

  next = postLedger(next, {
    type: "SPONSOR",
    label: `Patrocínio mensal (${mk})`,
    amount: base + bonus,
    meta: { base, bonus, performanceScore }
  });

  return next;
}

export function applyMatchGateIncome(state, homeClubId, userClubId, result) {
  // MVP: renda de bilheteria só se usuário for mandante
  if (homeClubId !== userClubId) return state;
  let next = ensureEconomyState(state);
  const e = next.career.economy;

  const goals = (result?.homeGoals || 0) + (result?.awayGoals || 0);
  const income = 450_000 + goals * 120_000; // simples e “sentível”
  e.balance += income;
  e.lastMatchIncome = income;

  next = postLedger(next, { type: "GATE", label: "Bilheteria (jogo em casa)", amount: income });

  return next;
}