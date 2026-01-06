function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function ensurePlayerStatusState(state) {
  const next = structuredClone(state);
  if (!next.career) next.career = {};
  if (!next.career.playerStatus) next.career.playerStatus = {};
  if (!next.career.training) {
    next.career.training = {
      plan: "BALANCED", // LIGHT | BALANCED | INTENSE
      focus: "GENERAL", // GENERAL | ATTACK | DEFENSE | PHYSICAL | TECHNICAL
      lastAppliedIso: null
    };
  }
  return next;
}

export function getPlayerStatus(state, playerId) {
  const map = state?.career?.playerStatus || {};
  const s = map[playerId];
  if (s) return s;
  return {
    fitness: 78,
    morale: 74,
    sharpness: 70,
    injuryDays: 0
  };
}

export function setPlayerStatus(state, playerId, status) {
  const next = structuredClone(state);
  if (!next.career) next.career = {};
  if (!next.career.playerStatus) next.career.playerStatus = {};
  next.career.playerStatus[playerId] = {
    fitness: clamp(status.fitness ?? 75, 0, 100),
    morale: clamp(status.morale ?? 75, 0, 100),
    sharpness: clamp(status.sharpness ?? 70, 0, 100),
    injuryDays: clamp(status.injuryDays ?? 0, 0, 365)
  };
  return next;
}

export function tickInjuryDays(state, days = 7) {
  const next = structuredClone(state);
  const map = next.career?.playerStatus || {};
  for (const id of Object.keys(map)) {
    const s = map[id];
    if (s.injuryDays > 0) s.injuryDays = Math.max(0, s.injuryDays - days);
  }
  return next;
}

export function applyMatchDayFatigueAndMorale(state, playerIdsUsed, matchOutcome) {
  // matchOutcome: "WIN" | "DRAW" | "LOSS"
  const next = structuredClone(state);
  if (!next.career) next.career = {};
  if (!next.career.playerStatus) next.career.playerStatus = {};

  const moraleDelta = matchOutcome === "WIN" ? 4 : matchOutcome === "DRAW" ? 1 : -4;

  for (const id of playerIdsUsed) {
    const cur = next.career.playerStatus[id] || getPlayerStatus({ career: { playerStatus: {} } }, id);

    // fadiga pós-jogo
    const fit = clamp(cur.fitness - 9, 0, 100);

    // sharpness sobe se jogou, mas cai se estiver cansado
    const sharp = clamp(cur.sharpness + 2 - (fit < 55 ? 2 : 0), 0, 100);

    // moral muda pelo resultado
    const mor = clamp(cur.morale + moraleDelta, 0, 100);

    next.career.playerStatus[id] = { ...cur, fitness: fit, sharpness: sharp, morale: mor };
  }
  return next;
}

export function effectiveOverall(baseOverall, status) {
  // transforma status em um modificador pequeno (premium/realista)
  // fitness/morale/sharpness (0-100) => -3 a +3 (aprox)
  const f = (status.fitness - 50) / 25;     // -2 .. +2
  const m = (status.morale - 50) / 25;      // -2 .. +2
  const s = (status.sharpness - 50) / 25;   // -2 .. +2

  let mod = f + m + s; // -6..+6 possível, mas raramente

  // lesionado penaliza muito
  if (status.injuryDays > 0) mod -= 18;

  // limita impacto total
  mod = clamp(mod, -12, 8);

  return clamp(Math.round(baseOverall + mod), 1, 99);
}