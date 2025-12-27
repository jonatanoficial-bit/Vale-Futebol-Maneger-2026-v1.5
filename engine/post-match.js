/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/post-match.js — Pós-jogo AAA (ratings, MOTM, forma/moral)
   -------------------------------------------------------
   Entrega:
   - Gera ratings (1.0–10.0) por jogador
   - Escolhe MOTM (melhor da partida)
   - Aplica impacto em:
     • Training.playerState: form / morale + minutesSeason
     • Fitness: fatigue + chance de lesão (se módulo existir)
   - Registra feed de notícias e log em gameState.postMatch

   Estrutura salva:
   gameState.postMatch = {
     last: report,
     history: [report...]
   }

   API:
   - PostMatch.processMatch(matchSummary)
     matchSummary:
     {
       homeId, awayId, goalsHome, goalsAway,
       tacticsHome?, tacticsAway?,
       minute, finishedISO
     }
   - PostMatch.getLast()
   =======================================================*/

(function () {
  console.log("%c[PostMatch] post-match.js carregado", "color:#fb7185; font-weight:bold;");

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd() { return Math.random(); }
  function nowISO() { return new Date().toISOString(); }
  function deepClone(x) { return JSON.parse(JSON.stringify(x)); }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.seasonYear) gs.seasonYear = 2026;

    if (!gs.postMatch || typeof gs.postMatch !== "object") gs.postMatch = {};
    if (!gs.postMatch.history || !Array.isArray(gs.postMatch.history)) gs.postMatch.history = [];
    if (!gs.postMatch.last) gs.postMatch.last = null;

    return gs;
  }

  function save() {
    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}
    try { if (typeof salvarJogo === "function") salvarJogo(); } catch (e) {}
    try { localStorage.setItem("vfm-save", JSON.stringify(window.gameState)); } catch (e) {}
  }

  function news(title, body) {
    try { if (window.News && typeof News.pushNews === "function") News.pushNews(title, body, "POSTMATCH"); } catch (e) {}
  }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }
  function getPlayers() {
    return (window.Database && Array.isArray(Database.players)) ? Database.players : [];
  }
  function getTeamById(id) {
    return getTeams().find(t => String(t.id) === String(id)) || null;
  }
  function getPlayerById(id) {
    return getPlayers().find(p => String(p.id) === String(id)) || null;
  }
  function getTeamPlayers(teamId) {
    return getPlayers().filter(p => String(p.teamId) === String(teamId));
  }

  function playerName(p) {
    return p ? (p.name || p.nome || `Jogador ${p.id}`) : "—";
  }
  function teamName(id) {
    return getTeamById(id)?.name || String(id || "—");
  }
  function posLabel(p) {
    return String(p?.position || p?.posicao || p?.pos || "—").toUpperCase();
  }
  function getOVR(p) {
    return n(p?.ovr ?? p?.overall ?? p?.OVR, 70);
  }

  // Fitness integration (opcional)
  function fitnessGet(pid) {
    try {
      if (window.Fitness && typeof Fitness.ensurePlayer === "function") return Fitness.ensurePlayer(pid);
      if (window.Fitness && typeof Fitness.getPlayer === "function") return Fitness.getPlayer(pid);
    } catch (e) {}
    return { fatigue: 15, injuryWeeks: 0 };
  }
  function fitnessSet(pid, obj) {
    try { if (window.Fitness && typeof Fitness.setPlayer === "function") Fitness.setPlayer(pid, obj); } catch (e) {}
  }

  // Training integration (opcional)
  function trainingState(pid) {
    try {
      if (window.Training && typeof Training.getPlayerState === "function") return Training.getPlayerState(pid);
    } catch (e) {}
    return null;
  }
  function trainingAddMinutes(pid, min) {
    try { if (window.Training && typeof Training.addMinutes === "function") Training.addMinutes(pid, min); } catch (e) {}
  }
  function trainingMutate(pid, patch) {
    // Training.js guarda em gameState.training.playerState; alteramos direto com segurança
    try {
      if (!window.gameState || !window.gameState.training) return;
      const tr = window.gameState.training;
      if (!tr.playerState) tr.playerState = {};
      const id = String(pid);
      if (!tr.playerState[id]) tr.playerState[id] = { morale: 70, form: 65, minutesSeason: 0 };
      const st = tr.playerState[id];
      if (patch.morale != null) st.morale = clamp(n(patch.morale, st.morale), 0, 100);
      if (patch.form != null) st.form = clamp(n(patch.form, st.form), 0, 100);
    } catch (e) {}
  }

  // -----------------------------
  // Seleção de 11 jogadores
  // - Se for time do usuário e existir Tactics, usa titulares
  // - Caso contrário, pega top 11 por OVR
  // -----------------------------
  function pickStartingXI(teamId) {
    const tid = String(teamId);
    const players = getTeamPlayers(tid);

    // tentativa: usar Tactics do usuário
    try {
      if (window.Game && String(window.Game.teamId) === tid && window.Tactics && typeof Tactics.getEscalacaoCompleta === "function") {
        const esc = Tactics.getEscalacaoCompleta();
        const titulares = (esc.titulares || [])
          .map(s => getPlayerById(s.playerId))
          .filter(Boolean);

        if (titulares.length >= 8) {
          // completa com melhores faltantes se estiver incompleto
          const used = new Set(titulares.map(p => String(p.id)));
          const rest = players
            .filter(p => !used.has(String(p.id)))
            .sort((a, b) => getOVR(b) - getOVR(a));
          while (titulares.length < 11 && rest.length) titulares.push(rest.shift());
          return titulares.slice(0, 11);
        }
      }
    } catch (e) {}

    // fallback: top 11 por OVR
    return players
      .slice()
      .sort((a, b) => getOVR(b) - getOVR(a))
      .slice(0, 11);
  }

  // -----------------------------
  // Distribuição de gols (simplificada)
  // - favorece atacantes/meias
  // -----------------------------
  function pickScorers(teamXI, goals) {
    const scorers = [];
    if (!goals || goals <= 0 || !teamXI.length) return scorers;

    // pesos por posição
    function weight(p) {
      const pos = posLabel(p);
      if (pos.includes("ST") || pos.includes("ATA") || pos.includes("CF") || pos.includes("FW")) return 1.8;
      if (pos.includes("AM") || pos.includes("MEI") || pos.includes("CM") || pos.includes("MC") || pos.includes("W")) return 1.2;
      if (pos.includes("DM") || pos.includes("VOL")) return 0.7;
      if (pos.includes("CB") || pos.includes("ZAG")) return 0.35;
      if (pos.includes("LB") || pos.includes("RB") || pos.includes("LE") || pos.includes("LD")) return 0.45;
      if (pos.includes("GK") || pos.includes("GOL")) return 0.05;
      return 0.8;
    }

    const pool = teamXI.map(p => ({ p, w: weight(p) }));
    const totalW = pool.reduce((s, x) => s + x.w, 0) || 1;

    for (let g = 0; g < goals; g++) {
      let r = rnd() * totalW;
      let chosen = pool[0].p;
      for (const it of pool) {
        r -= it.w;
        if (r <= 0) { chosen = it.p; break; }
      }
      scorers.push({ playerId: chosen.id, name: playerName(chosen) });
    }
    return scorers;
  }

  // -----------------------------
  // Ratings
  // -----------------------------
  function computeTeamBaseRating(goalsFor, goalsAgainst) {
    // base por resultado
    if (goalsFor > goalsAgainst) return 7.1;
    if (goalsFor === goalsAgainst) return 6.8;
    return 6.3;
  }

  function tacticsImpact(teamId) {
    // converte modificadores em um delta pequeno nas notas
    try {
      if (window.Tactics && typeof Tactics.getMatchModifiers === "function") {
        const m = Tactics.getMatchModifiers(teamId);
        const atk = (n(m.attackMul, 1) - 1) * 1.2;
        const def = (n(m.defenseMul, 1) - 1) * 0.9;
        const risk = (n(m.riskMul, 1) - 1) * -0.8;
        const tempo = (n(m.tempoMul, 1) - 1) * 0.6;
        return clamp(atk + def + risk + tempo, -0.35, 0.35);
      }
    } catch (e) {}
    return 0;
  }

  function ratePlayers(teamId, xi, goalsFor, goalsAgainst, scorers) {
    const base = computeTeamBaseRating(goalsFor, goalsAgainst);
    const tacDelta = tacticsImpact(teamId);

    // mapa de gols
    const goalMap = {};
    scorers.forEach(s => {
      goalMap[String(s.playerId)] = (goalMap[String(s.playerId)] || 0) + 1;
    });

    const ratings = xi.map(p => {
      const ovr = getOVR(p);
      const pos = posLabel(p);

      // ovr influencia “consistência”
      const ovrDelta = clamp((ovr - 70) / 200, -0.25, 0.25);

      // posições defensivas sofrem mais quando tomam gols
      let posDefPenalty = 0;
      if (goalsAgainst > 0) {
        if (pos.includes("GK") || pos.includes("GOL")) posDefPenalty -= goalsAgainst * 0.18;
        else if (pos.includes("CB") || pos.includes("ZAG")) posDefPenalty -= goalsAgainst * 0.12;
        else if (pos.includes("LB") || pos.includes("RB") || pos.includes("LE") || pos.includes("LD")) posDefPenalty -= goalsAgainst * 0.09;
        else if (pos.includes("DM") || pos.includes("VOL")) posDefPenalty -= goalsAgainst * 0.06;
      }

      // atacantes ganham mais quando fazem gols
      const g = goalMap[String(p.id)] || 0;
      const goalBonus = g > 0 ? (0.55 * g) : 0;

      // ruído
      const noise = (rnd() - 0.5) * 0.55;

      let rating = base + tacDelta + ovrDelta + posDefPenalty + goalBonus + noise;
      rating = clamp(rating, 4.5, 9.9);

      return {
        playerId: p.id,
        name: playerName(p),
        pos,
        ovr,
        goals: g,
        minutes: 90,
        rating: Number(rating.toFixed(1))
      };
    });

    // pequeno ajuste: se time fez 0 gols e perdeu feio, limita teto
    if (goalsFor === 0 && goalsAgainst >= 3) {
      ratings.forEach(r => r.rating = Math.min(r.rating, 6.8));
    }

    // ordena por rating desc
    ratings.sort((a, b) => n(b.rating, 0) - n(a.rating, 0));

    return ratings;
  }

  // -----------------------------
  // Aplicar efeitos no estado do jogo
  // -----------------------------
  function applyEffects(teamId, ratings, goalsFor, goalsAgainst, isUserTeam) {
    // resultado define moral geral
    const win = goalsFor > goalsAgainst;
    const draw = goalsFor === goalsAgainst;

    for (const r of ratings) {
      const pid = r.playerId;

      // minutos
      trainingAddMinutes(pid, 90);

      // Training: forma/moral
      const st = trainingState(pid) || { morale: 70, form: 65 };
      const rating = n(r.rating, 6.5);

      // forma é muito afetada por rating
      const formDelta = clamp((rating - 6.6) * 2.2, -5.0, 5.0);

      // moral depende mais do resultado e um pouco do rating
      let moraleDelta = 0;
      if (win) moraleDelta += 3.2;
      else if (draw) moraleDelta += 1.0;
      else moraleDelta -= 2.6;

      moraleDelta += clamp((rating - 6.6) * 1.0, -2.0, 2.0);

      // jogadores que fizeram gols ganham mais moral
      if (r.goals > 0) moraleDelta += 0.8 * r.goals;

      trainingMutate(pid, {
        form: n(st.form, 65) + formDelta,
        morale: n(st.morale, 70) + moraleDelta
      });

      // Fitness: fadiga e chance de lesão (opcional)
      const fit = fitnessGet(pid);
      const addFatigue = clamp(10 + (rnd() * 6) + (win ? 0 : 1.5) + (rating < 6.0 ? 1.0 : 0), 8, 18);
      fit.fatigue = clamp(n(fit.fatigue, 15) + addFatigue, 0, 100);

      // chance de lesão pós-jogo: sobe com fadiga alta
      const f = clamp(n(fit.fatigue, 15), 0, 100);
      const injChance = (f > 85 ? 0.05 : f > 75 ? 0.03 : 0.015) * (0.8 + rnd() * 0.6);
      if (n(fit.injuryWeeks, 0) <= 0 && rnd() < injChance) {
        fit.injuryWeeks = 1 + Math.floor(rnd() * 5); // 1-5 semanas
        // pancada na moral/forma
        const st2 = trainingState(pid) || { morale: 70, form: 65 };
        trainingMutate(pid, { morale: n(st2.morale, 70) - 3.5, form: n(st2.form, 65) - 2.8 });
      }

      fitnessSet(pid, fit);
    }

    // notícia geral (apenas para o usuário)
    if (isUserTeam) {
      const motm = ratings[0];
      const resText = win ? "VITÓRIA" : draw ? "EMPATE" : "DERROTA";
      news("Pós-jogo", `${resText}! Melhor em campo: ${motm.name} (${motm.rating}).`);
    }
  }

  // -----------------------------
  // Main: processar partida
  // -----------------------------
  function processMatch(matchSummary) {
    const gs = ensureGS();
    const homeId = matchSummary.homeId;
    const awayId = matchSummary.awayId;
    const goalsHome = n(matchSummary.goalsHome, 0);
    const goalsAway = n(matchSummary.goalsAway, 0);

    const xiHome = pickStartingXI(homeId);
    const xiAway = pickStartingXI(awayId);

    const scorersHome = pickScorers(xiHome, goalsHome);
    const scorersAway = pickScorers(xiAway, goalsAway);

    const ratingsHome = ratePlayers(homeId, xiHome, goalsHome, goalsAway, scorersHome);
    const ratingsAway = ratePlayers(awayId, xiAway, goalsAway, goalsHome, scorersAway);

    // MOTM geral
    const bestHome = ratingsHome[0];
    const bestAway = ratingsAway[0];
    const motm = (n(bestHome.rating, 0) >= n(bestAway.rating, 0)) ? bestHome : bestAway;

    const userTeamId = (window.Game && Game.teamId) ? String(Game.teamId) : null;
    const isUserHome = userTeamId && String(homeId) === userTeamId;
    const isUserAway = userTeamId && String(awayId) === userTeamId;

    // aplica efeitos (Training/Fitness)
    applyEffects(homeId, ratingsHome, goalsHome, goalsAway, !!isUserHome);
    applyEffects(awayId, ratingsAway, goalsAway, goalsHome, !!isUserAway);

    // captura lesões geradas (para mostrar na UI)
    function collectInjuries(ratings) {
      const inj = [];
      for (const r of ratings) {
        const fit = fitnessGet(r.playerId);
        if (n(fit.injuryWeeks, 0) > 0) {
          inj.push({
            playerId: r.playerId,
            name: r.name,
            weeks: n(fit.injuryWeeks, 0)
          });
        }
      }
      // remove duplicatas e pega top 6
      const uniq = [];
      const seen = new Set();
      for (const x of inj) {
        const k = String(x.playerId);
        if (seen.has(k)) continue;
        seen.add(k);
        uniq.push(x);
      }
      uniq.sort((a, b) => n(b.weeks, 0) - n(a.weeks, 0));
      return uniq.slice(0, 6);
    }

    const report = {
      iso: matchSummary.finishedISO || nowISO(),
      homeId,
      awayId,
      homeName: teamName(homeId),
      awayName: teamName(awayId),
      goalsHome,
      goalsAway,
      scorersHome,
      scorersAway,
      ratingsHome,
      ratingsAway,
      motm,
      injuriesHome: collectInjuries(ratingsHome),
      injuriesAway: collectInjuries(ratingsAway)
    };

    gs.postMatch.last = deepClone(report);
    gs.postMatch.history.unshift(deepClone(report));
    gs.postMatch.history = gs.postMatch.history.slice(0, 40);

    save();
    return report;
  }

  function getLast() {
    const gs = ensureGS();
    return gs.postMatch.last ? deepClone(gs.postMatch.last) : null;
  }

  // -----------------------------
  // Public API
  // -----------------------------
  window.PostMatch = {
    processMatch,
    getLast
  };
})();