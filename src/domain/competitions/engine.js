import { tableFromSerialized, applyResult } from "./leagueTable.js";
import { CompetitionType } from "./competitionTypes.js";
import { simulateMatch } from "../matchSim.js";
import { applyMatchEconomy, applyMonthlySponsorIfNeeded } from "../economy/economy.js";

// Resolve placeholders simples
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

export function playFixtureAtCalendarIndex({
  season,
  calendarIndex,
  packId,
  userClubId,
  userLineup,
  squadsByClub,
  playersByIdGlobal,
  state,            // NEW: estado completo para economia
  onStateUpdated    // NEW: callback para salvar economia/ledger
}) {
  const f = season.calendar[calendarIndex];
  if (!f || f.played) return { season, sim: null };

  const homeId = resolvePlaceholder(f.homeId, season);
  const awayId = resolvePlaceholder(f.awayId, season);

  const sim = simulateMatch({
    packId,
    fixtureId: f.id,
    homeId,
    awayId,
    squadsByClub,
    userClubId,
    userLineup,
    playersByIdGlobal
  });

  // Atualiza fixture no calendário
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

  // Atualiza fixture dentro da competição
  const nextCompetitions = season.competitions.map(c => {
    if (c.id !== f.competitionId) return c;

    const idx = c.fixtures.findIndex(x => x.id === f.id);
    const nextFixtures = c.fixtures.slice();
    if (idx >= 0) nextFixtures[idx] = nextCalendar[calendarIndex];

    // Liga -> tabela
    if (c.type === CompetitionType.LEAGUE) {
      const tableMap = tableFromSerialized(c.table);
      applyResult(tableMap, homeId, awayId, sim.homeGoals, sim.awayGoals);
      return { ...c, fixtures: nextFixtures, table: Array.from(tableMap.entries()) };
    }

    // Copa/Super
    return { ...c, fixtures: nextFixtures, bracket: { fixtures: nextFixtures } };
  });

  // Avança calendarIndex
  let nextIndex = season.calendarIndex || 0;
  while (nextIndex < nextCalendar.length && nextCalendar[nextIndex].played) nextIndex++;

  const nextSeason = {
    ...season,
    competitions: nextCompetitions,
    calendar: nextCalendar,
    calendarIndex: nextIndex,
    lastMatch: sim
  };

  // ECONOMIA: patrocínio mensal + receita do jogo (se for do usuário)
  if (typeof onStateUpdated === "function" && state) {
    let st = structuredClone(state);

    // sponsor mensal baseado na data do fixture
    st = applyMonthlySponsorIfNeeded(st, f.date);

    // receita do jogo se usuário participou
    st = applyMatchEconomy({ state: st, match: sim, fixture: nextCalendar[calendarIndex] });

    onStateUpdated(st);
  }

  return { season: nextSeason, sim };
}