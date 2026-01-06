export const CompetitionType = Object.freeze({
  LEAGUE: "LEAGUE",
  CUP: "CUP",
  SUPERCUP: "SUPERCUP",
  INTERNATIONAL: "INTERNATIONAL"
});

export function isLeague(c) {
  return c?.type === CompetitionType.LEAGUE;
}

export function isCup(c) {
  return c?.type === CompetitionType.CUP || c?.type === CompetitionType.SUPERCUP || c?.type === CompetitionType.INTERNATIONAL;
}