import { tableFromSerialized } from "./leagueTable.js";
import { computeBrazilQualifications } from "./qualifications.js";

function orderTable(map) {
  const arr = Array.from(map.entries()).map(([teamId, r]) => ({
    teamId,
    pts: r.pts,
    gd: r.gd,
    gf: r.gf
  }));
  arr.sort((a, b) =>
    (b.pts - a.pts) ||
    (b.gd - a.gd) ||
    (b.gf - a.gf) ||
    String(a.teamId).localeCompare(String(b.teamId), "pt-BR")
  );
  return arr;
}

function winnerFromCup(comp) {
  const finals = (comp.fixtures || []).filter(f => f.played);
  if (!finals.length) return null;
  const last = finals[finals.length - 1];
  if (!last.result) return null;
  return last.result.homeGoals > last.result.awayGoals
    ? last.homeId
    : last.awayId;
}

export function closeSeasonAndComputeQualifications({ season }) {
  const serieA = season.competitions.find(c => c.id === "BRA_A");
  const copaBR = season.competitions.find(c => c.id === "CDB");
  const libertadores = season.competitions.find(c => c.id === "LIB");

  if (!serieA || !copaBR) return null;

  const tableMap = tableFromSerialized(serieA.table);
  const ordered = orderTable(tableMap);

  const championSerieA = ordered[0]?.teamId || null;
  const winnerCDB = winnerFromCup(copaBR);
  const winnerLIB = libertadores ? winnerFromCup(libertadores) : null;

  const quals = computeBrazilQualifications({
    serieATable: ordered,
    copaDoBrasilWinnerId: winnerCDB
  });

  return {
    champions: {
      BRA_A: championSerieA,
      CDB: winnerCDB,
      LIB: winnerLIB
    },
    qualifications: {
      BRA: {
        libertadores: quals.libertadores,
        sulamericana: quals.sulamericana
      }
    }
  };
}