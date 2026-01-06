// /src/domain/competitions/seasonBuilderV5.js
import { CompetitionType } from "./competitionTypes.js";
import { buildGroupsCup } from "./groupsCup.js";

function makeLeague({ id, name, teamIds }) {
  const table = teamIds.map(t => [
    t,
    { pts: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0 }
  ]);

  const fixtures = [];
  // MVP: turno único (ida única)
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      fixtures.push({
        id: `${id}::${teamIds[i]}_vs_${teamIds[j]}`,
        competitionId: id,
        stage: "LEAGUE",
        groupId: null,
        round: null,
        homeId: teamIds[i],
        awayId: teamIds[j],
        date: null,
        played: false,
        result: null
      });
    }
  }
  return { id, name, type: CompetitionType.LEAGUE, teamIds, table, fixtures };
}

function makeCupPlaceholder({ id, name }) {
  return { id, name, type: CompetitionType.CUP, fixtures: [], bracket: { fixtures: [] } };
}

export function buildSeasonV5({ pack, prevClosure, yearLabel }) {
  const nextYear = yearLabel || (new Date().getFullYear() + 1);
  const seasonId = `SEASON_${nextYear}`;

  const listA = (prevClosure?.nextLeagueLists?.A || []).slice(0, 20);
  const listB = (prevClosure?.nextLeagueLists?.B || []).slice(0, 20);
  const listC = (prevClosure?.nextLeagueLists?.C || []).slice(0, 20);

  // Segurança: se listas estiverem vazias, tenta cair para Brasil do pack
  const clubs = pack.content.clubs.clubs;
  const br = clubs.filter(c => c.country === "Brasil").map(c => c.id);
  const fallbackA = br.slice(0, 20);
  const fallbackB = br.slice(20, 40).length ? br.slice(20, 40) : fallbackA;
  const fallbackC = br.slice(40, 60).length ? br.slice(40, 60) : fallbackA;

  const serieA = makeLeague({
    id: "BRA_A",
    name: "Brasileirão Série A",
    teamIds: listA.length ? listA : fallbackA
  });

  const serieB = makeLeague({
    id: "BRA_B",
    name: "Brasileirão Série B",
    teamIds: listB.length ? listB : fallbackB
  });

  const serieC = makeLeague({
    id: "BRA_C",
    name: "Brasileirão Série C",
    teamIds: listC.length ? listC : fallbackC
  });

  // Copas (MVP): placeholder (chaveamento completo entra em patch futuro)
  const copaBR = makeCupPlaceholder({ id: "CDB", name: "Copa do Brasil" });
  const superCopa = makeCupPlaceholder({ id: "SCB", name: "Supercopa do Brasil" });

  // Libertadores / Sul-Americana baseadas nas vagas do Brasil (v0.9.1)
  const libTeams = (prevClosure?.qualifications?.BRA?.libertadores || []).slice();
  const sulaTeams = (prevClosure?.qualifications?.BRA?.sulamericana || []).slice();

  // MVP: grupos mínimos (2 grupos) para não exigir 32 clubes no conteúdo
  // Você pode expandir depois para 8 grupos quando seu pack CONMEBOL estiver completo.
  const libertadores = buildGroupsCup({
    compId: "LIB",
    name: "Libertadores da América",
    seed: `${seasonId}::LIB`,
    teamIds: libTeams.length ? libTeams : (serieA.teamIds.slice(0, 6)),
    groupsCount: 2,
    groupSize: 4
  });

  const sulamericana = buildGroupsCup({
    compId: "SULA",
    name: "Copa Sul-Americana",
    seed: `${seasonId}::SULA`,
    teamIds: sulaTeams.length ? sulaTeams : (serieA.teamIds.slice(6, 12)),
    groupsCount: 2,
    groupSize: 4
  });

  const competitions = [serieA, serieB, serieC, copaBR, superCopa, libertadores, sulamericana];
  const calendar = competitions.flatMap(c => c.fixtures || []);

  return {
    id: seasonId,
    competitions,
    calendar,
    calendarIndex: 0,
    lastMatch: null,
    meta: {
      generatedFrom: "v1.0.1",
      prevChampions: prevClosure?.champions || {},
      prevQualifications: prevClosure?.qualifications || {},
      movement: prevClosure?.movement || null
    }
  };
}