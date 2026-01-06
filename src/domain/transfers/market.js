import { rngFromString, int, shuffle } from "../competitions/rng.js";
import { makeGeneratedPlayer } from "../roster/rosterService.js";

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length)];
}

const POS = ["GK","RB","LB","CB","CDM","CM","CAM","RM","LM","RW","LW","ST"];

function genNationality(rng) {
  const list = ["Brasil","Argentina","Uruguai","Colômbia","Chile","Paraguai","Equador","Peru","Portugal","Espanha"];
  return pick(list, rng);
}

function wageForOverall(ovr) {
  const base = Math.max(15000, Math.round((ovr - 50) * 5000));
  return Math.round(base / 1000) * 1000;
}

export function generateMarket({ packId, clubId, size = 80 }) {
  const rng = rngFromString(`${packId}::MARKET::${clubId}`);
  const tier = "A"; // mercado global tende a ter mistura; a variação vem do overall

  const players = [];
  for (let i = 0; i < size; i++) {
    const pos = POS[int(rng, 0, POS.length - 1)];
    const p = makeGeneratedPlayer({
      seedKey: `${packId}::MARKET`,
      clubId: "FREE",
      idx: i + 1,
      position: pos,
      tier
    });

    // ajusta para mercado (mais variedade)
    const ovr = int(rng, 60, 86);
    p.overall = ovr;
    p.potential = Math.min(92, ovr + int(rng, 0, 10));
    p.age = int(rng, 17, 33);
    p.nationality = genNationality(rng);
    p.wageMonthly = wageForOverall(ovr);
    p.value = Math.round((ovr * ovr) * int(rng, 900, 1700));
    p.id = `MKT_${String(i + 1).padStart(4, "0")}_${pos}`;
    p.generated = true;
    p.clubId = "FREE";

    players.push(p);
  }

  return shuffle(rng, players);
}

export function filterMarket(players, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return players;

  return players.filter(p => {
    const name = String(p.name || "").toLowerCase();
    const pos = String((p.positions && p.positions[0]) || "").toLowerCase();
    const nat = String(p.nationality || "").toLowerCase();
    const ovr = String(p.overall || "");
    return name.includes(q) || pos.includes(q) || nat.includes(q) || ovr === q;
  });
}

export function sortMarket(players, mode) {
  const m = mode || "VALUE_DESC";
  const arr = players.slice();

  if (m === "OVR_DESC") arr.sort((a,b)=>(b.overall-a.overall) || (b.value-a.value));
  else if (m === "OVR_ASC") arr.sort((a,b)=>(a.overall-b.overall) || (a.value-b.value));
  else if (m === "VALUE_ASC") arr.sort((a,b)=>(a.value-b.value) || (a.overall-b.overall));
  else arr.sort((a,b)=>(b.value-a.value) || (b.overall-a.overall));

  return arr;
}

export function estimateTransferFee(player) {
  // taxa de compra: value * 1.05 ~ 1.25
  const v = Math.max(50_000, player.value || 0);
  return Math.round(v * 1.12);
}