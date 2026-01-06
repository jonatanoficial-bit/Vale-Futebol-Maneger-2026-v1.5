// /src/domain/competitions/seasonClosure.js
import { tableFromSerialized } from "./leagueTable.js";
import { computeBrazilQualifications } from "./qualifications.js";
import { computePromotionRelegation, applyPromotionRelegation } from "../season/promotionRelegation.js";

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
  const played = (comp?.fixtures || []).filter(f => f.played && f.result);
  if (!played.length) return null;
  const last = played[played.length - 1];
  return last.result.homeGoals > last.result.awayGoals ? last.homeId : last.awayId;
}

function leagueTeamIdsFromComp(comp) {
  if (!comp) return [];
  if (Array.isArray(comp.teamIds) && comp.teamIds.length) return comp.teamIds.slice();
  if (Array.isArray(comp.table) && comp.table.length) return comp.table.map(([teamId]) => teamId);
  return [];
}

export function closeSeasonAndComputeQualifications({ season }) {
  const serieA = season.competitions.find(c => c.id === "BRA_A");
  const serieB = season.competitions.find(c => c.id === "BRA_B");
  const serieC = season.competitions.find(c => c.id === "BRA_C");
  const copaBR = season.competitions.find(c => c.id === "CDB");
  const libertadores = season.competitions.find(c => c.id === "LIB");

  if (!serieA || !copaBR) return null;

  // Campeões
  const orderedA = orderTable(tableFromSerialized(serieA.table));
  const championSerieA = orderedA[0]?.teamId || null;

  const winnerCDB = winnerFromCup(copaBR);
  const winnerLIB = libertadores ? winnerFromCup(libertadores) : null;

  // Vagas Brasil (Liberta/Sula)
  const quals = computeBrazilQualifications({
    serieATable: orderedA,
    copaDoBrasilWinnerId: winnerCDB
  });

  // Promoção/Rebaixamento (A/B/C)
  // Se B/C não existirem na temporada atual, não quebra: apenas não aplica movimento.
  const movement = (serieB && serieC)
    ? computePromotionRelegation({ season, slots: 4 })
    : { ok: false, reason: "BRA_B/BRA_C ausentes na temporada atual." };

  // Listas atuais (base)
  const currentLists = {
    A: leagueTeamIdsFromComp(serieA),
    B: leagueTeamIdsFromComp(serieB),
    C: leagueTeamIdsFromComp(serieC)
  };

  const nextLeagueLists = movement?.ok
    ? applyPromotionRelegation({ currentLists, movement })
    : currentLists;

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
    },
    movement: movement?.ok ? movement : null,
    nextLeagueLists: {
      A: nextLeagueLists.A || currentLists.A || [],
      B: nextLeagueLists.B || currentLists.B || [],
      C: nextLeagueLists.C || currentLists.C || []
    }
  };
}