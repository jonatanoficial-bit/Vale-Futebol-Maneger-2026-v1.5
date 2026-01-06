import { CompetitionType } from "./competitionTypes.js";
import { buildGroupsCup } from "./groupsCup.js";

function makeLeague({ id, name, teamIds }) {
  const table = teamIds.map(t => [
    t,
    { pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }
  ]);
  const fixtures = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      fixtures.push({
        id: `${id}::${teamIds[i]}_vs_${teamIds[j]}`,
        competitionId: id,
        stage: "LEAGUE",
        homeId: teamIds[i],
        awayId: teamIds[j],
        played: false,
        result: null
      });
    }
  }
  return { id, name, type: CompetitionType.LEAGUE, teamIds, table, fixtures };
}

export function buildSeasonV4({ pack, prevClosure }) {
  const clubs = pack.content.clubs.clubs;

  const br = clubs.filter(c => c.country === "Brasil").map(c => c.id);
  const serieAIds = br.slice(0, 20);

  const serieA = makeLeague({
    id: "BRA_A",
    name: "Brasileirão Série A",
    teamIds: serieAIds
  });

  const copaBR = {
    id: "CDB",
    name: "Copa do Brasil",
    type: CompetitionType.CUP,
    fixtures: [],
    bracket: { fixtures: [] }
  };

  const libTeams = prevClosure.qualifications.BRA.libertadores;
  const sulaTeams = prevClosure.qualifications.BRA.sulamericana;

  const libertadores = buildGroupsCup({
    compId: "LIB",
    name: "Libertadores da América",
    seed: `LIB_${Date.now()}`,
    teamIds: libTeams,
    groupsCount: 2,
    groupSize: 4
  });

  const sulamericana = buildGroupsCup({
    compId: "SULA",
    name: "Copa Sul-Americana",
    seed: `SULA_${Date.now()}`,
    teamIds: sulaTeams,
    groupsCount: 2,
    groupSize: 4
  });

  const competitions = [serieA, copaBR, libertadores, sulamericana];
  const calendar = competitions.flatMap(c => c.fixtures || []);

  return {
    id: `SEASON_${new Date().getFullYear() + 1}`,
    competitions,
    calendar,
    calendarIndex: 0,
    lastMatch: null,
    meta: {
      generatedFrom: "v0.9.1",
      qualifications: prevClosure.qualifications,
      champions: prevClosure.champions
    }
  };
}