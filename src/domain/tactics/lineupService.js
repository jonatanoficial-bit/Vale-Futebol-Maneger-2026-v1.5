import { formationById, roleSpec } from "./formations.js";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function hasAnyPosition(playerPositions, allowedPositions) {
  if (!Array.isArray(playerPositions) || playerPositions.length === 0) return false;
  return playerPositions.some(p => allowedPositions.includes(p));
}

export function ensureLineup(state) {
  const next = structuredClone(state);
  if (!next.career) next.career = {};

  if (!next.career.tactics) {
    next.career.tactics = {
      style: "BALANCED", // DEFENSIVE | BALANCED | ATTACKING
      pressing: "NORMAL", // LOW | NORMAL | HIGH
      tempo: "NORMAL" // SLOW | NORMAL | FAST
    };
  } else {
    if (!next.career.tactics.style) next.career.tactics.style = "BALANCED";
    if (!next.career.tactics.pressing) next.career.tactics.pressing = "NORMAL";
    if (!next.career.tactics.tempo) next.career.tactics.tempo = "NORMAL";
  }

  if (!next.career.lineup) {
    next.career.lineup = { formationId: "4-3-3", starters: {}, bench: [] };
  } else {
    if (!next.career.lineup.formationId) next.career.lineup.formationId = "4-3-3";
    if (!next.career.lineup.starters) next.career.lineup.starters = {};
    if (!Array.isArray(next.career.lineup.bench)) next.career.lineup.bench = [];
  }

  // normaliza conforme formação
  next.career.lineup = normalizeLineupForFormation(next.career.lineup);

  return next;
}

export function normalizeLineupForFormation(lineup) {
  const f = formationById(lineup.formationId);
  const starters = { ...lineup.starters };

  // remove chaves que não existem na formação
  const allowedKeys = new Set(f.roles.map(r => r.key));
  for (const k of Object.keys(starters)) {
    if (!allowedKeys.has(k)) delete starters[k];
  }

  // garante benchSize
  const bench = (lineup.bench || []).slice(0, f.benchSize);

  return { ...lineup, starters, bench };
}

export function chemistryPenaltyForAssignment({ formationId, roleKey, player }) {
  const spec = roleSpec(formationId, roleKey);
  if (!spec) return { ok: true, penalty: 0, reason: "" };

  const ok = hasAnyPosition(player.positions || [], spec.allowed);
  if (ok) return { ok: true, penalty: 0, reason: "" };

  // penalidade premium, mas sem “matar” o jogo
  // (futuro: pode variar por overall/potential)
  return { ok: false, penalty: 6, reason: `Fora de posição: precisa ${spec.allowed.join("/")}` };
}

export function autoPickLineup({ formationId, squad }) {
  const f = formationById(formationId);
  const used = new Set();
  const starters = {};

  // ordena por overall desc (fallback 0)
  const byOvr = squad.slice().sort((a, b) => (b.overall || 0) - (a.overall || 0));

  for (const role of f.roles) {
    const candidates = byOvr.filter(p => !used.has(p.id));
    // tenta encaixar posição correta primeiro
    let picked = candidates.find(p => (p.positions || []).some(pos => role.allowed.includes(pos)));
    if (!picked) picked = candidates[0] || null;
    if (picked) {
      starters[role.key] = picked.id;
      used.add(picked.id);
    }
  }

  // banco: melhores restantes
  const remaining = byOvr.filter(p => !used.has(p.id));
  const bench = remaining.slice(0, f.benchSize).map(p => p.id);

  return { formationId, starters, bench };
}

export function validateLineup({ formationId, squadById, lineup }) {
  const f = formationById(formationId);
  const starters = lineup.starters || {};
  const bench = lineup.bench || [];

  const issues = [];
  const used = new Set();

  for (const role of f.roles) {
    const pid = starters[role.key];
    if (!pid) issues.push(`Faltando: ${role.label}`);
    else {
      if (used.has(pid)) issues.push(`Jogador repetido no XI: ${pid}`);
      used.add(pid);
      const p = squadById.get(pid);
      if (!p) issues.push(`Jogador não existe no elenco: ${pid}`);
    }
  }

  for (const pid of bench) {
    if (!pid) continue;
    if (used.has(pid)) issues.push(`Jogador repetido (XI/Banco): ${pid}`);
    used.add(pid);
    const p = squadById.get(pid);
    if (!p) issues.push(`Jogador não existe no elenco: ${pid}`);
  }

  if (bench.length > f.benchSize) issues.push(`Banco maior que ${f.benchSize}.`);

  return { ok: issues.length === 0, issues };
}

export function computeTacticsTeamModifier(tactics) {
  // Pequenos modificadores para o match (AAA: sutil e realista)
  // Retorna { atk, def, pace } em “pontos de overall” para serem usados como ajuste.
  const style = tactics?.style || "BALANCED";
  const pressing = tactics?.pressing || "NORMAL";
  const tempo = tactics?.tempo || "NORMAL";

  let atk = 0, def = 0, pace = 0;

  if (style === "DEFENSIVE") { def += 2; atk -= 1; }
  if (style === "ATTACKING") { atk += 2; def -= 1; }

  if (pressing === "HIGH") { def += 1; atk += 1; pace += 1; }
  if (pressing === "LOW") { def += 1; pace -= 1; }

  if (tempo === "FAST") { atk += 1; pace += 2; def -= 1; }
  if (tempo === "SLOW") { def += 1; pace -= 1; }

  return {
    atk: clamp(atk, -3, 3),
    def: clamp(def, -3, 3),
    pace: clamp(pace, -3, 3)
  };
}