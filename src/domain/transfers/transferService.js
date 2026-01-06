import { ensureTransferState, createOffer, evaluateOffer } from "./transferMarket.js";
import { ensureEconomyState, postLedger } from "../economy/sponsorService.js";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function ensureCareerRoster(state) {
  const next = structuredClone(state);
  if (!next.career) next.career = {};
  if (!next.career.roster) {
    next.career.roster = { signedPlayers: [], releasedIds: [], transactions: [] };
  } else {
    if (!Array.isArray(next.career.roster.signedPlayers)) next.career.roster.signedPlayers = [];
    if (!Array.isArray(next.career.roster.releasedIds)) next.career.roster.releasedIds = [];
    if (!Array.isArray(next.career.roster.transactions)) next.career.roster.transactions = [];
  }
  return next;
}

export function signFromMarket({ state, player, fee, wageMonthly, years }) {
  let next = ensureTransferState(ensureEconomyState(ensureCareerRoster(state)));

  const e = next.career.economy;
  const totalCostNow = fee;

  if (e.balance < totalCostNow) {
    return { ok: false, reason: "Saldo insuficiente para pagar a taxa.", state };
  }

  const offer = createOffer({ player, fee, wageMonthly, years });
  const evalRes = evaluateOffer({ player, offer, clubReputation: 0.55 });

  const offers = next.career.transfers.offers.slice();
  offers.unshift(offer);
  next.career.transfers.offers = offers.slice(0, 80);

  if (!evalRes.accepted) {
    offer.status = "REJECTED";
    return { ok: false, reason: "Proposta recusada pelo jogador.", state: next };
  }

  offer.status = "ACCEPTED";

  // paga taxa
  e.balance -= fee;
  next = postLedger(next, { type: "TRANSFER_FEE", label: `Contratação: ${player.name}`, amount: -fee, meta: { playerId: player.id } });

  // adiciona ao elenco (assina)
  const signed = next.career.roster.signedPlayers.slice();
  signed.push({
    ...player,
    clubId: next.career.clubId,
    contract: {
      wageMonthly,
      years,
      signedAt: new Date().toISOString()
    }
  });
  next.career.roster.signedPlayers = signed;

  // remove do mercado
  next.career.transfers.market = (next.career.transfers.market || []).filter(p => p.id !== player.id);

  // registra transação
  next.career.roster.transactions.unshift({
    at: new Date().toISOString(),
    type: "SIGN",
    playerId: player.id,
    fee,
    wageMonthly,
    years
  });
  next.career.roster.transactions = next.career.roster.transactions.slice(0, 120);

  return { ok: true, reason: "Contratação concluída.", state: next };
}

export function releasePlayer({ state, playerId }) {
  let next = ensureCareerRoster(ensureEconomyState(state));
  const roster = next.career.roster;

  roster.releasedIds = Array.from(new Set([...(roster.releasedIds || []), playerId]));

  roster.transactions.unshift({
    at: new Date().toISOString(),
    type: "RELEASE",
    playerId
  });
  roster.transactions = roster.transactions.slice(0, 120);

  return { ok: true, reason: "Jogador dispensado.", state: next };
}

export function estimateMonthlyWageBill({ state, derivedSquad }) {
  // soma contratos do elenco (signedPlayers) + wages do pack/gerados
  let total = 0;
  for (const p of derivedSquad) {
    const w = p?.contract?.wageMonthly ?? p?.wageMonthly ?? 0;
    total += Number(w) || 0;
  }
  return Math.round(total);
}

export function payMonthlyWagesIfNeeded({ state, isoDate, derivedSquad }) {
  const next = ensureEconomyState(state);
  const e = next.career.economy;

  // usa a mesma chave de mês do sponsor: paga 1 vez por mês
  const d = new Date(isoDate || new Date().toISOString());
  const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

  if (e.lastWageMonth === mk) return next;

  const wages = estimateMonthlyWageBill({ state: next, derivedSquad });
  e.wageMonthlyEstimate = wages;

  e.balance -= wages;
  e.lastWageMonth = mk;

  return postLedger(next, { type: "WAGES", label: `Folha salarial (${mk})`, amount: -wages });
}