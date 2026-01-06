import { tableFromSerialized, applyResult } from "./leagueTable.js";
import { CompetitionType } from "./competitionTypes.js";
import { simulateMatch } from "../matchSim.js";

// Resolve placeholders simples
function resolvePlaceholder(teamId, season) {
  if (!teamId) return teamId;
  if (!String(teamId).startsWith("LIB_CHAMP")) return teamId;
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
  playersByIdGlobal
}) {
  const f = season.calendar[calendarIndex];
  if (!f || f.played) return { season, sim: null };

  const homeId = resolvePlaceholder(f.homeId, season);
  const awayId = resolvePlaceholder(f.awayId, season);

  // Se placeholder ainda não resolvido, não joga
  if (String(homeId).includes("LIB_CHAMP")) return { season, sim: null };

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
  const comp = competitionById(season, f.competitionId);
  const nextCompetitions = season.competitions.map(c => {
    if (c.id !== f.competitionId) return c;

    const idx = c.fixtures.findIndex(x => x.id === f.id);
    const nextFixtures = c.fixtures.slice();
    if (idx >= 0) nextFixtures[idx] = nextCalendar[calendarIndex];

    // Liga -> tabela
    if (c.type === "LEAGUE") {
      const tableMap = tableFromSerialized(c.table);
      applyResult(tableMap, homeId, awayId, sim.homeGoals, sim.awayGoals);
      return { ...c, fixtures: nextFixtures, table: Array.from(tableMap.entries()) };
    }

    // Copa/Super -> só mantém fixtures com resultado; vencedor pode ser usado no futuro
    return { ...c, fixtures: nextFixtures, bracket: { fixtures: nextFixtures } };
  });

  // Avança calendarIndex
  let nextIndex = season.calendarIndex || 0;
  while (nextIndex < nextCalendar.length && nextCalendar[nextIndex].played) nextIndex++;

  // Se Libertadores terminou, define LIB_CHAMP para Intercontinental (MVP):
  // Para MVP, consideramos “campeão” o 1º da tabela (após todos jogos da lib jogados).
  let finalCompetitions = nextCompetitions.slice();
  const lib = finalCompetitions.find(c => c.id === "CONMEBOL-LIB");
  if (lib && lib.table) {
    const libAllPlayed = lib.fixtures.every(x => x.played);
    if (libAllPlayed) {
      const map = tableFromSerialized(lib.table);
      const rows = Array.from(map.values()).sort((a,b)=> (b.points-a.points) || (b.gd-a.gd) || (b.gf-a.gf));
      const champ = rows[0]?.clubId || null;
      if (champ) {
        // resolve placeholders no Intercontinental
        finalCompetitions = finalCompetitions.map(c => {
          if (c.id !== "WORLD-INTER") return c;
          const fix = c.fixtures.map(m => ({
            ...m,
            homeId: m.homeId === "LIB_CHAMP" ? champ : m.homeId
          }));
          return { ...c, fixtures: fix, bracket: { fixtures: fix }, clubIds: [champ, "EUR_CHAMP"] };
        });

        // também resolve no calendário
        const cal2 = nextCalendar.map(m => ({
          ...m,
          homeId: (m.competitionId === "WORLD-INTER" && m.homeId === "LIB_CHAMP") ? champ : m.homeId
        }));
        nextCalendar.splice(0, nextCalendar.length, ...cal2);
      }
    }
  }

  const nextSeason = {
    ...season,
    competitions: finalCompetitions,
    calendar: nextCalendar,
    calendarIndex: nextIndex,
    lastMatch: sim
  };

  return { season: nextSeason, sim };
}