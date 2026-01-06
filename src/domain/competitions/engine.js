import { tableFromSerialized, applyResult } from "./leagueTable.js";
import { CompetitionType } from "./competitionTypes.js";
import { simulateMatch } from "../matchSim.js";
import { applyMatchEconomy, applyMonthlySponsorIfNeeded } from "../economy/economy.js";
import { effectiveOverall, getPlayerStatus, applyMatchDayFatigueAndMorale } from "../training/playerStatus.js";

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

function withEffectiveOverallsForClub({ state, playersByClub, clubId }) {
  // playersByClub é Map<clubId, players[]>
  // retornamos um Map novo, mas só ajustamos o clube do usuário
  const next = new Map(playersByClub);
  const list = next.get(clubId);
  if (!Array.isArray(list) || list.length === 0) return next;

  const adjusted = list.map(p => {
    const base = p.overall ?? p.ovr ?? 70;
    const st = getPlayerStatus(state, p.id);
    const eff = effectiveOverall(base, st);
    return { ...p, overall: eff, _baseOverall: base };
  });

  next.set(clubId, adjusted);
  return next;
}

function guessOutcomeForUser(sim, userClubId) {
  const isHome = sim.homeId === userClubId;
  const gf = isHome ? sim.homeGoals : sim.awayGoals;
  const ga = isHome ? sim.awayGoals : sim.homeGoals;
  if (gf > ga) return "WIN";
  if (gf < ga) return "LOSS";
  return "DRAW";
}

function collectUserPlayersUsed(userLineup) {
  // MVP: se lineup vazio, não aplica pós-jogo (evita quebrar)
  const ids = [];
  if (!userLineup) return ids;
  const starters = userLineup.starters || {};
  for (const k of Object.keys(starters)) {
    if (starters[k]) ids.push(starters[k]);
  }
  const bench = userLineup.bench || [];
  for (const id of bench) if (id) ids.push(id);
  // remove duplicados
  return Array.from(new Set(ids));
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

  // ✅ aplica treino/status no OVR do clube do usuário (sem mexer nos outros)
  const adjustedSquads = state ? withEffectiveOverallsForClub({ state, playersByClub: squadsByClub, clubId: userClubId }) : squadsByClub;

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

  // ✅ ECONOMIA + ✅ pós-jogo (fadiga/moral)
  if (typeof onStateUpdated === "function" && state) {
    let st = structuredClone(state);

    st = applyMonthlySponsorIfNeeded(st, f.date);
    st = applyMatchEconomy({ state: st, match: sim, fixture: nextCalendar[calendarIndex] });

    // pós-jogo para elenco do usuário (se o usuário participou)
    const involved = sim.homeId === userClubId || sim.awayId === userClubId;
    if (involved) {
      const used = collectUserPlayersUsed(userLineup);
      const outcome = guessOutcomeForUser(sim, userClubId);
      st = applyMatchDayFatigueAndMorale(st, used, outcome);
    }

    onStateUpdated(st);
  }

  return { season: nextSeason, sim };
}