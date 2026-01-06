import { tableFromSerialized, applyResult } from "./leagueTable.js";
import { CompetitionType } from "./competitionTypes.js";
import { simulateMatch } from "../matchSim.js";
import { applyMatchEconomy, applyMonthlySponsorIfNeeded } from "../economy/economy.js";
import {
  effectiveOverall,
  getPlayerStatus,
  applyMatchDayFatigueAndMorale
} from "../training/playerStatus.js";
import { formationById, roleSpec } from "../tactics/formations.js";
import { computeTacticsTeamModifier } from "../tactics/lineupService.js";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function resolvePlaceholder(teamId, season) {
  if (!teamId) return teamId;
  return teamId;
}

function competitionById(season, competitionId) {
  return season.competitions.find(c => c.id === competitionId) || null;
}

export function getNextUserFixture(season, userClubId) {
  for (let i = season.calendarIndex || 0; i < season.calendar.length; i++) {
    const f = season.calendar[i];
    const home = resolvePlaceholder(f.homeId, season);
    const away = resolvePlaceholder(f.awayId, season);
    if (f.played) continue;
    if (home === userClubId || away === userClubId) return { index: i, fixture: f };
  }
  return null;
}

export function getCompetitionViewState(season, competitionId) {
  const comp = competitionById(season, competitionId);
  if (!comp) return null;
  if (comp.type === CompetitionType.LEAGUE) {
    const map = tableFromSerialized(comp.table);
    return { kind: "LEAGUE", tableMap: map, fixtures: comp.fixtures };
  }
  return { kind: "CUP", bracket: comp.bracket, fixtures: comp.fixtures };
}

function hasAnyPosition(playerPositions, allowedPositions) {
  if (!Array.isArray(playerPositions) || playerPositions.length === 0) return false;
  return playerPositions.some(p => allowedPositions.includes(p));
}

function chemistryPenaltyOverall({ formationId, roleKey, player }) {
  const spec = roleSpec(formationId, roleKey);
  if (!spec) return 0;
  const ok = hasAnyPosition(player.positions || [], spec.allowed);
  return ok ? 0 : 6; // penalidade padrão
}

function collectUserPlayersUsedWithBench(userLineup, formationId) {
  const ids = [];
  if (!userLineup) return ids;

  const starters = userLineup.starters || {};
  for (const k of Object.keys(starters)) if (starters[k]) ids.push(starters[k]);

  // “substituições automáticas simples” (MVP v0.8):
  // considera até 3 do banco como “usados” (afeta fadiga/moral pós-jogo).
  const bench = (userLineup.bench || []).filter(Boolean);
  const f = formationById(formationId);
  const maxSubs = clamp(3, 0, f.benchSize);

  for (let i = 0; i < Math.min(maxSubs, bench.length); i++) ids.push(bench[i]);

  return Array.from(new Set(ids));
}

function guessOutcomeForUser(sim, userClubId) {
  const isHome = sim.homeId === userClubId;
  const gf = isHome ? sim.homeGoals : sim.awayGoals;
  const ga = isHome ? sim.awayGoals : sim.homeGoals;
  if (gf > ga) return "WIN";
  if (gf < ga) return "LOSS";
  return "DRAW";
}

function withEffectiveOverallsForUserClub({ state, playersByClub, userClubId, userLineup }) {
  const next = new Map(playersByClub);
  const list = next.get(userClubId);
  if (!Array.isArray(list) || list.length === 0) return next;

  const formationId = userLineup?.formationId || state?.career?.lineup?.formationId || "4-3-3";
  const starters = userLineup?.starters || state?.career?.lineup?.starters || {};
  const tactics = state?.career?.tactics || {};
  const tacMod = computeTacticsTeamModifier(tactics);

  const starterRoleByPlayerId = new Map();
  for (const roleKey of Object.keys(starters)) {
    const pid = starters[roleKey];
    if (pid) starterRoleByPlayerId.set(pid, roleKey);
  }

  const adjusted = list.map(p => {
    const base = p.overall ?? p.ovr ?? 70;
    const st = getPlayerStatus(state, p.id);
    let eff = effectiveOverall(base, st);

    // Penalidade de posição só para titulares (faz sentido)
    const roleKey = starterRoleByPlayerId.get(p.id);
    if (roleKey) {
      const pen = chemistryPenaltyOverall({ formationId, roleKey, player: p });
      eff = clamp(eff - pen, 1, 99);
    }

    // Modificador tático leve (aplicado no elenco inteiro para “sentir” diferença)
    // Mantém sutil para não quebrar realismo.
    const tDelta = tacMod.atk + tacMod.def + tacMod.pace; // -9..+9, mas limitado abaixo
    eff = clamp(eff + clamp(tDelta, -2, 2), 1, 99);

    return { ...p, overall: eff, _baseOverall: base };
  });

  next.set(userClubId, adjusted);
  return next;
}

export function playFixtureAtCalendarIndex({
  season,
  calendarIndex,
  packId,
  userClubId,
  userLineup,
  squadsByClub,
  playersByIdGlobal,
  state,
  onStateUpdated
}) {
  const f = season.calendar[calendarIndex];
  if (!f || f.played) return { season, sim: null };

  const homeId = resolvePlaceholder(f.homeId, season);
  const awayId = resolvePlaceholder(f.awayId, season);

  // ✅ aplica status+química+tática no clube do usuário
  const adjustedSquads = state
    ? withEffectiveOverallsForUserClub({ state, playersByClub: squadsByClub, userClubId, userLineup })
    : squadsByClub;

  const sim = simulateMatch({
    packId,
    fixtureId: f.id,
    homeId,
    awayId,
    squadsByClub: adjustedSquads,
    userClubId,
    userLineup,
    playersByIdGlobal
  });

  const nextCalendar = season.calendar.slice();
  nextCalendar[calendarIndex] = {
    ...f,
    homeId,
    awayId,
    played: true,
    result: {
      homeGoals: sim.homeGoals,
      awayGoals: sim.awayGoals,
      homeRating: sim.homeRating,
      awayRating: sim.awayRating,
      events: sim.events
    }
  };

  const nextCompetitions = season.competitions.map(c => {
    if (c.id !== f.competitionId) return c;

    const idx = c.fixtures.findIndex(x => x.id === f.id);
    const nextFixtures = c.fixtures.slice();
    if (idx >= 0) nextFixtures[idx] = nextCalendar[calendarIndex];

    if (c.type === CompetitionType.LEAGUE) {
      const tableMap = tableFromSerialized(c.table);
      applyResult(tableMap, homeId, awayId, sim.homeGoals, sim.awayGoals);
      return { ...c, fixtures: nextFixtures, table: Array.from(tableMap.entries()) };
    }

    return { ...c, fixtures: nextFixtures, bracket: { fixtures: nextFixtures } };
  });

  let nextIndex = season.calendarIndex || 0;
  while (nextIndex < nextCalendar.length && nextCalendar[nextIndex].played) nextIndex++;

  const nextSeason = {
    ...season,
    competitions: nextCompetitions,
    calendar: nextCalendar,
    calendarIndex: nextIndex,
    lastMatch: sim
  };

  // ✅ ECONOMIA + ✅ pós-jogo (inclui “uso” de banco)
  if (typeof onStateUpdated === "function" && state) {
    let st = structuredClone(state);

    st = applyMonthlySponsorIfNeeded(st, f.date);
    st = applyMatchEconomy({ state: st, match: sim, fixture: nextCalendar[calendarIndex] });

    const involved = sim.homeId === userClubId || sim.awayId === userClubId;
    if (involved) {
      const formationId = st.career?.lineup?.formationId || "4-3-3";
      const used = collectUserPlayersUsedWithBench(userLineup || st.career?.lineup, formationId);
      const outcome = guessOutcomeForUser(sim, userClubId);
      st = applyMatchDayFatigueAndMorale(st, used, outcome);
    }

    onStateUpdated(st);
  }

  return { season: nextSeason, sim };
}