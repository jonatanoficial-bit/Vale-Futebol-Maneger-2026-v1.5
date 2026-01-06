import { rngFromString, int } from "./rng.js";
import { computeTeamRating, getFormation } from "./lineupModel.js";
import { computeOverall } from "./playerModel.js";

// Poisson sampler simples
function poisson(rng, lambda) {
  // Knuth
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > L);
  return k - 1;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function autoPickXI({ clubId, squad, formationId }) {
  const formation = getFormation(formationId);
  const sorted = squad.slice().sort((a, b) => (b.overall - a.overall) || a.name.localeCompare(b.name, "pt-BR"));
  const starters = {};
  const used = new Set();

  function take(predicate) {
    const p = sorted.find(x => !used.has(x.id) && predicate(x));
    if (p) { used.add(p.id); return p.id; }
    return null;
  }

  for (const slot of formation.slots) {
    const want =
      slot.startsWith("GK") ? ["GK"] :
      slot.startsWith("RB") ? ["RB","RWB"] :
      slot.startsWith("LB") ? ["LB","LWB"] :
      slot.startsWith("CB") ? ["CB"] :
      slot.startsWith("CDM") ? ["CDM","CM"] :
      slot.startsWith("CM") ? ["CM","CDM","CAM"] :
      slot.startsWith("CAM") || slot.startsWith("RAM") || slot.startsWith("LAM") ? ["CAM","CM","RW","LW"] :
      slot.startsWith("RM") ? ["RM","RW"] :
      slot.startsWith("LM") ? ["LM","LW"] :
      slot.startsWith("RW") ? ["RW","RM"] :
      slot.startsWith("LW") ? ["LW","LM"] :
      slot.startsWith("ST") ? ["ST"] : [];

    let pid = take(p => want.includes((p.positions || [])[0]));
    if (!pid) pid = take(_ => true);
    starters[slot] = pid;
  }

  return { formationId, starters, bench: [] };
}

function teamRatingFromLineup(lineup, playersById) {
  // usa computeTeamRating quando possível
  const rating = computeTeamRating(lineup, playersById);
  if (rating) return rating;

  // fallback: média do top 11
  const all = Array.from(playersById.values());
  all.sort((a,b)=>(b.overall ?? computeOverall(a)) - (a.overall ?? computeOverall(a)));
  const top = all.slice(0, 11);
  if (top.length === 0) return 60;
  const sum = top.reduce((acc, p) => acc + (p.overall ?? computeOverall(p)), 0);
  return Math.round(sum / top.length);
}

export function simulateMatch({
  packId,
  fixtureId,
  homeId,
  awayId,
  squadsByClub,      // Map clubId -> players[]
  userClubId,
  userLineup,        // do save
  playersByIdGlobal  // Map playerId -> player
}) {
  const rng = rngFromString(`${packId}::MATCH::${fixtureId}::${homeId}vs${awayId}`);

  const homeSquad = squadsByClub.get(homeId) || [];
  const awaySquad = squadsByClub.get(awayId) || [];

  // Lineups
  let homeLineup;
  let awayLineup;

  const defaultFormation = userLineup?.formationId || "4-3-3";

  if (homeId === userClubId) {
    homeLineup = userLineup;
  } else {
    homeLineup = autoPickXI({ clubId: homeId, squad: homeSquad, formationId: defaultFormation });
  }

  if (awayId === userClubId) {
    awayLineup = userLineup;
  } else {
    awayLineup = autoPickXI({ clubId: awayId, squad: awaySquad, formationId: defaultFormation });
  }

  // Rating
  // Para clubes adversários, precisamos de um playersById de time, mas usamos o global já enriquecido.
  const homePlayersById = new Map();
  for (const p of homeSquad) homePlayersById.set(p.id, p);
  const awayPlayersById = new Map();
  for (const p of awaySquad) awayPlayersById.set(p.id, p);

  const homeRating = teamRatingFromLineup(homeLineup, homePlayersById);
  const awayRating = teamRatingFromLineup(awayLineup, awayPlayersById);

  // Modelo de gols:
  // base lambda ~ 1.25, diferença de rating altera.
  const homeAdv = 0.20;
  const diff = (homeRating - awayRating) / 20; // ~ -1.5..+1.5
  const base = 1.25;

  const lambdaHome = clamp(base + homeAdv + diff * 0.55, 0.2, 3.2);
  const lambdaAway = clamp(base + (-homeAdv) + (-diff) * 0.55, 0.2, 3.2);

  const homeGoals = poisson(rng, lambdaHome);
  const awayGoals = poisson(rng, lambdaAway);

  // “Momentos” do jogo
  const events = [];
  const totalEvents = int(rng, 3, 9);

  function randomScorer(clubId, squad) {
    const attackers = squad.filter(p => {
      const pos = (p.positions || [])[0] || "";
      return ["ST","RW","LW","CAM","CM","RM","LM"].includes(pos);
    });
    const pool = attackers.length ? attackers : squad;
    if (!pool.length) return null;
    const p = pool[Math.floor(rng() * pool.length)];
    return p?.name || null;
  }

  // distribui gols em minutos
  const goalTimeline = [];
  for (let i = 0; i < homeGoals; i++) goalTimeline.push({ clubId: homeId });
  for (let i = 0; i < awayGoals; i++) goalTimeline.push({ clubId: awayId });

  // embaralha e define minuto
  for (let i = goalTimeline.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [goalTimeline[i], goalTimeline[j]] = [goalTimeline[j], goalTimeline[i]];
  }
  for (const g of goalTimeline) {
    g.minute = int(rng, 3, 90);
    g.player = g.clubId === homeId ? randomScorer(homeId, homeSquad) : randomScorer(awayId, awaySquad);
  }
  goalTimeline.sort((a,b)=>a.minute - b.minute);

  for (const g of goalTimeline) {
    events.push({ type: "GOAL", minute: g.minute, clubId: g.clubId, text: `${g.player || "Jogador"} marcou!` });
  }

  // cartões aleatórios
  const cards = int(rng, 0, 4);
  for (let i = 0; i < cards; i++) {
    const isHome = rng() < 0.5;
    const clubId = isHome ? homeId : awayId;
    const squad = isHome ? homeSquad : awaySquad;
    const p = squad[Math.floor(rng() * Math.max(1, squad.length))];
    const minute = int(rng, 10, 90);
    events.push({ type: "CARD", minute, clubId, text: `${p?.name || "Jogador"} recebeu cartão` });
  }

  events.sort((a,b)=>a.minute - b.minute);

  return {
    fixtureId,
    homeId,
    awayId,
    homeRating,
    awayRating,
    homeGoals,
    awayGoals,
    events
  };
}