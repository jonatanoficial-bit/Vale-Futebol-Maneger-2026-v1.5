import { shuffle } from "./rng.js";

function roundRobinOneLeg(clubIds) {
  const ids = clubIds.slice();
  const n = ids.length;

  const isOdd = n % 2 === 1;
  if (isOdd) ids.push("BYE");

  const size = ids.length;
  const rounds = size - 1;
  const half = size / 2;

  const arr = ids.slice();
  const fixturesByRound = [];

  for (let r = 0; r < rounds; r++) {
    const pairs = [];
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[size - 1 - i];
      if (a !== "BYE" && b !== "BYE") {
        const home = (r + i) % 2 === 0 ? a : b;
        const away = (r + i) % 2 === 0 ? b : a;
        pairs.push({ homeId: home, awayId: away });
      }
    }
    fixturesByRound.push(pairs);

    const fixed = arr[0];
    const rest = arr.slice(1);
    rest.unshift(rest.pop());
    arr.splice(0, arr.length, fixed, ...rest);
  }

  return fixturesByRound;
}

export function buildLeagueFixtures({ rng, competitionId, clubIds, startDateIso, roundEveryDays = 7, doubleRound = true }) {
  const oneLeg = roundRobinOneLeg(clubIds);
  const rounds = [];

  // ida
  for (const r of oneLeg) rounds.push(r);

  // volta (inverte mandos)
  if (doubleRound) {
    for (const r of oneLeg) {
      rounds.push(r.map(m => ({ homeId: m.awayId, awayId: m.homeId })));
    }
  }

  let date = startDateIso;
  let seq = 1;
  const fixtures = [];

  for (let i = 0; i < rounds.length; i++) {
    const matches = shuffle(rng, rounds[i]);
    for (const m of matches) {
      fixtures.push({
        id: `${competitionId}_M_${String(seq).padStart(4, "0")}`,
        competitionId,
        stage: "LEAGUE",
        round: i + 1,
        date,
        homeId: m.homeId,
        awayId: m.awayId,
        played: false,
        result: null
      });
      seq++;
    }
    // próxima rodada
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + roundEveryDays);
    date = d.toISOString().slice(0, 10);
  }

  return fixtures;
}

function nextPowerOfTwo(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function buildKnockoutFixtures({ rng, competitionId, clubIds, startDateIso, roundEveryDays = 14, legs = 1, labelPrefix = "R" }) {
  // cria chaves até 2^k com BYE
  const shuffled = shuffle(rng, clubIds);
  const target = nextPowerOfTwo(shuffled.length);
  while (shuffled.length < target) shuffled.push("BYE");

  let date = startDateIso;
  let seq = 1;

  const rounds = [];
  let current = shuffled.slice();
  let roundIndex = 1;

  while (current.length > 1) {
    const matches = [];
    for (let i = 0; i < current.length; i += 2) {
      const a = current[i];
      const b = current[i + 1];
      if (a === "BYE" && b === "BYE") continue;
      if (a === "BYE") {
        // b avança automaticamente
        matches.push({ homeId: b, awayId: "BYE", byeWinner: b });
      } else if (b === "BYE") {
        matches.push({ homeId: a, awayId: "BYE", byeWinner: a });
      } else {
        matches.push({ homeId: a, awayId: b, byeWinner: null });
      }
    }

    // para o bracket state (vamos guardar “slots”)
    const stageName = `${labelPrefix}${roundIndex}`;

    for (const m of matches) {
      if (m.awayId === "BYE") {
        rounds.push({
          id: `${competitionId}_M_${String(seq).padStart(4, "0")}`,
          competitionId,
          stage: stageName,
          round: roundIndex,
          date,
          homeId: m.homeId,
          awayId: m.awayId,
          played: true,
          result: {
            homeGoals: 0,
            awayGoals: 0,
            autoWin: true,
            winnerId: m.byeWinner,
            events: []
          }
        });
        seq++;
        continue;
      }

      // 1 ou 2 jogos
      rounds.push({
        id: `${competitionId}_M_${String(seq).padStart(4, "0")}`,
        competitionId,
        stage: stageName,
        round: roundIndex,
        leg: 1,
        date,
        homeId: m.homeId,
        awayId: m.awayId,
        played: false,
        result: null
      });
      seq++;

      if (legs === 2) {
        const d = new Date(date + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + 7);
        const date2 = d.toISOString().slice(0, 10);
        rounds.push({
          id: `${competitionId}_M_${String(seq).padStart(4, "0")}`,
          competitionId,
          stage: stageName,
          round: roundIndex,
          leg: 2,
          date: date2,
          homeId: m.awayId,
          awayId: m.homeId,
          played: false,
          result: null
        });
        seq++;
      }
    }

    // prepara próxima rodada (apenas “placeholders”; winners serão calculados depois)
    // aqui, só reduz tamanho pela metade, com placeholders W{idx}
    const next = [];
    const numPairs = Math.ceil(matches.length / 1);
    for (let i = 0; i < numPairs; i++) next.push(`W${roundIndex}_${i + 1}`);
    current = next;

    // avança data
    const d = new Date(date + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + roundEveryDays);
    date = d.toISOString().slice(0, 10);

    roundIndex++;
  }

  // Observação: essa estrutura é “chave pré-gerada” com placeholders.
  // O motor de competição resolve placeholders a cada fase concluída.
  return rounds;
}