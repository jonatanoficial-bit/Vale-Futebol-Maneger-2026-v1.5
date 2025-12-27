/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/training.js — Treino + Progressão (FM-like)
   -------------------------------------------------------
   Entrega:
   - Progressão semanal baseada em:
     • idade, potencial (pot), overall (ovr)
     • minutos jogados (match exposure)
     • plano de treino (intensidade e foco)
     • fadiga e lesões (Fitness)
     • moral e forma (Training cria se não existir)
   - Declínio gradual para veteranos
   - Integração opcional com Save/News/Fitness

   Persistência:
   gameState.training = {
     year, week, lastAppliedISO,
     plansByTeam: { [teamId]: { intensity, focus } },
     playerState: { [playerId]: { morale, form, minutesSeason } },
     logs: [ ... ]
   }

   API:
   - Training.ensure()
   - Training.getTeamPlan(teamId)
   - Training.setTeamPlan(teamId, plan)
   - Training.getPlayerState(playerId)
   - Training.applyWeek(teamId)        // aplica uma semana
   - Training.addMinutes(playerId, min)
   - Training.getWeeklyReport(teamId)  // último report
   =======================================================*/

(function () {
  console.log("%c[Training] training.js carregado", "color:#a78bfa; font-weight:bold;");

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd() { return Math.random(); }
  function nowISO() { return new Date().toISOString(); }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.seasonYear) gs.seasonYear = 2026;

    if (!gs.training || typeof gs.training !== "object") gs.training = {};
    const tr = gs.training;

    if (tr.year == null) tr.year = gs.seasonYear;
    if (tr.week == null) tr.week = 1;
    if (!tr.lastAppliedISO) tr.lastAppliedISO = null;

    if (!tr.plansByTeam || typeof tr.plansByTeam !== "object") tr.plansByTeam = {};
    if (!tr.playerState || typeof tr.playerState !== "object") tr.playerState = {};
    if (!Array.isArray(tr.logs)) tr.logs = [];

    return gs;
  }

  function getPlayers() {
    return (window.Database && Array.isArray(Database.players)) ? Database.players : [];
  }
  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }
  function getPlayerById(id) {
    return getPlayers().find(p => String(p.id) === String(id)) || null;
  }
  function getTeamPlayers(teamId) {
    return getPlayers().filter(p => String(p.teamId) === String(teamId));
  }

  function save() {
    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}
  }
  function news(title, body) {
    try { if (window.News && typeof News.pushNews === "function") News.pushNews(title, body, "TRAINING"); } catch (e) {}
  }

  // Fitness helpers (opcional)
  function fitnessGet(pid) {
    try {
      if (window.Fitness && typeof Fitness.ensurePlayer === "function") return Fitness.ensurePlayer(pid);
      if (window.Fitness && typeof Fitness.getPlayer === "function") return Fitness.getPlayer(pid);
    } catch (e) {}
    return { fatigue: 15, injuryWeeks: 0, yellowCards: 0 };
  }

  function fitnessSet(pid, obj) {
    try { if (window.Fitness && typeof Fitness.setPlayer === "function") Fitness.setPlayer(pid, obj); } catch (e) {}
  }

  // -----------------------------
  // Planos de treino
  // intensity: 1..5
  // focus: "BALANCED"|"FITNESS"|"ATTACK"|"DEFENSE"|"MENTAL"|"YOUTH"
  // -----------------------------
  const DEFAULT_PLAN = { intensity: 3, focus: "BALANCED" };

  function getTeamPlan(teamId) {
    const gs = ensureGS();
    const tr = gs.training;
    const tid = String(teamId);
    if (!tr.plansByTeam[tid]) tr.plansByTeam[tid] = Object.assign({}, DEFAULT_PLAN);
    // normaliza
    const p = tr.plansByTeam[tid];
    p.intensity = clamp(n(p.intensity, 3), 1, 5);
    p.focus = String(p.focus || "BALANCED").toUpperCase();
    return Object.assign({}, p);
  }

  function setTeamPlan(teamId, plan) {
    const gs = ensureGS();
    const tr = gs.training;
    const tid = String(teamId);
    const p = Object.assign({}, DEFAULT_PLAN, plan || {});
    p.intensity = clamp(n(p.intensity, 3), 1, 5);
    p.focus = String(p.focus || "BALANCED").toUpperCase();
    tr.plansByTeam[tid] = p;
    save();
    return Object.assign({}, p);
  }

  // -----------------------------
  // Estado do jogador (moral/forma/minutos)
  // -----------------------------
  function ensurePlayerState(pid) {
    const gs = ensureGS();
    const tr = gs.training;
    const id = String(pid);

    if (!tr.playerState[id]) {
      tr.playerState[id] = {
        morale: 60 + Math.floor(rnd() * 21), // 60-80
        form: 55 + Math.floor(rnd() * 21),   // 55-75
        minutesSeason: 0
      };
    }

    // clamp
    const st = tr.playerState[id];
    st.morale = clamp(n(st.morale, 70), 0, 100);
    st.form = clamp(n(st.form, 65), 0, 100);
    st.minutesSeason = Math.max(0, n(st.minutesSeason, 0));

    return st;
  }

  function getPlayerState(pid) {
    const st = ensurePlayerState(pid);
    return Object.assign({}, st);
  }

  function addMinutes(playerId, min) {
    const st = ensurePlayerState(playerId);
    st.minutesSeason += Math.max(0, n(min, 0));
  }

  // -----------------------------
  // Cálculo de progressão
  // -----------------------------
  function getAge(p) {
    // suporta age ou birthYear
    if (p.age != null) return n(p.age, 24);
    if (p.birthYear != null) {
      const y = ensureGS().seasonYear || 2026;
      return clamp(y - n(p.birthYear, y - 24), 15, 45);
    }
    return 24;
  }

  function getOVR(p) { return n(p.ovr ?? p.overall, 60); }
  function setOVR(p, val) {
    if (p.ovr != null) p.ovr = val;
    else p.overall = val;
  }

  function getPOT(p) { return n(p.pot ?? p.potential, Math.max(getOVR(p), 70)); }
  function setPOT(p, val) {
    if (p.pot != null) p.pot = val;
    else p.potential = val;
  }

  function focusMultiplier(focus, p) {
    // se tiver posição, dá um toque
    const pos = String(p.position || p.posicao || "").toUpperCase();
    switch (focus) {
      case "FITNESS": return 1.05;
      case "ATTACK": return (pos.includes("ST") || pos.includes("FW") || pos.includes("AM") || pos.includes("W")) ? 1.08 : 1.02;
      case "DEFENSE": return (pos.includes("CB") || pos.includes("LB") || pos.includes("RB") || pos.includes("DM")) ? 1.08 : 1.02;
      case "MENTAL": return 1.04;
      case "YOUTH": return getAge(p) <= 21 ? 1.10 : 1.00;
      default: return 1.00;
    }
  }

  function intensityEffects(intensity) {
    // maior intensidade -> mais evolução potencial, mas aumenta fadiga e risco
    const i = clamp(n(intensity, 3), 1, 5);
    return {
      gain: 0.65 + i * 0.12,   // 0.77 .. 1.25
      fatigue: 2 + i * 1.7,    // 3.7 .. 10.5
      injury: 0.004 + i * 0.002 // 0.006 .. 0.014
    };
  }

  function computeDelta(p, plan, st, fit) {
    const age = getAge(p);
    const ovr = getOVR(p);
    const pot = getPOT(p);

    // gap para potencial (quanto mais distante, mais cresce)
    const gap = clamp(pot - ovr, -20, 40);

    // participação (minutos)
    const mins = clamp(n(st.minutesSeason, 0), 0, 4000);
    const exposure = clamp(0.55 + (mins / 4000) * 0.55, 0.55, 1.10);

    // moral/forma (0..100)
    const moraleMul = clamp(0.85 + (n(st.morale, 60) / 100) * 0.35, 0.80, 1.20);
    const formMul = clamp(0.85 + (n(st.form, 60) / 100) * 0.35, 0.80, 1.20);

    // fadiga penaliza treino
    const fatigue = clamp(n(fit.fatigue, 15), 0, 100);
    const fatigueMul = clamp(1.08 - (fatigue / 100) * 0.65, 0.45, 1.08);

    // lesionado não treina direito
    const inj = n(fit.injuryWeeks, 0);
    const injuryMul = inj > 0 ? 0.25 : 1.0;

    // idade: jovens crescem, veteranos caem
    let ageMul = 1.0;
    if (age <= 18) ageMul = 1.22;
    else if (age <= 21) ageMul = 1.15;
    else if (age <= 25) ageMul = 1.05;
    else if (age <= 29) ageMul = 0.98;
    else if (age <= 32) ageMul = 0.92;
    else if (age <= 35) ageMul = 0.84;
    else ageMul = 0.74;

    // base de ganho semanal
    // (um valor pequeno, mas constante; depois de 30-40 semanas dá impacto real)
    const intFx = intensityEffects(plan.intensity);
    const focusMul = focusMultiplier(plan.focus, p);

    // tendência
    // - se gap > 0, cresce
    // - se gap < 0 (já acima do potencial), declina
    const trend = gap >= 0 ? 1 : -1;

    // magnitude
    const magnitude =
      (0.020 + (Math.abs(gap) / 100) * 0.060) *
      intFx.gain *
      focusMul *
      exposure *
      moraleMul *
      formMul *
      fatigueMul *
      injuryMul *
      ageMul;

    // introduz leve ruído
    const noise = (rnd() - 0.5) * 0.02;

    // se veterano, aplica declínio natural adicional
    let naturalDecline = 0;
    if (age >= 31) naturalDecline = (age - 30) * 0.0025; // 0.0025..0.02

    // delta final (caps)
    let delta = (trend * magnitude) - naturalDecline + noise;
    delta = clamp(delta, -0.12, 0.11);

    return { delta, intFx };
  }

  // -----------------------------
  // Aplicar uma semana
  // -----------------------------
  function applyWeek(teamId) {
    const gs = ensureGS();
    const tr = gs.training;
    const tid = String(teamId);

    const plan = getTeamPlan(tid);

    const players = getTeamPlayers(tid);
    if (!players.length) return { ok: false, msg: "Sem jogadores no time." };

    const changes = [];
    const intFx = intensityEffects(plan.intensity);

    for (const p of players) {
      const st = ensurePlayerState(p.id);
      const fit = fitnessGet(p.id);

      // se lesionado, reduz form
      if (n(fit.injuryWeeks, 0) > 0) {
        st.form = clamp(n(st.form, 60) - (2 + rnd() * 2), 0, 100);
        st.morale = clamp(n(st.morale, 60) - (0.8 + rnd() * 1.2), 0, 100);
      }

      // aplica fadiga do treino (fitness)
      fit.fatigue = clamp(n(fit.fatigue, 15) + intFx.fatigue * (0.75 + rnd() * 0.45), 0, 100);

      // chance de lesão por treino (se já fatigado, aumenta)
      const fatigue = clamp(n(fit.fatigue, 15), 0, 100);
      const injChance = intFx.injury + (fatigue > 75 ? 0.012 : 0) + (fatigue > 90 ? 0.015 : 0);
      if (rnd() < injChance && n(fit.injuryWeeks, 0) <= 0) {
        fit.injuryWeeks = 1 + Math.floor(rnd() * 4); // 1-4 semanas
        st.morale = clamp(n(st.morale, 60) - 3 - rnd() * 3, 0, 100);
        st.form = clamp(n(st.form, 60) - 2 - rnd() * 3, 0, 100);
      }

      // progressão/declínio
      const before = getOVR(p);
      const potBefore = getPOT(p);

      const { delta } = computeDelta(p, plan, st, fit);
      let after = clamp(before + delta, 30, 99);

      // limite suave por potencial (não trava, mas desacelera)
      const pot = getPOT(p);
      if (after > pot + 1.5) after = pot + 1.5;

      setOVR(p, Number(after.toFixed(2)));

      // potencial pode variar pouco (jovem melhora potencial com consistência)
      const age = getAge(p);
      if (age <= 22 && delta > 0.03 && n(st.form, 60) > 65 && rnd() < 0.10) {
        const newPot = clamp(potBefore + 0.05 + rnd() * 0.08, 40, 99);
        setPOT(p, Number(newPot.toFixed(2)));
      }

      // moral/forma evolução leve
      st.morale = clamp(n(st.morale, 60) + (delta > 0 ? 0.6 : -0.2) + (rnd() - 0.5) * 1.2, 0, 100);
      st.form = clamp(n(st.form, 60) + (delta > 0 ? 0.8 : -0.3) + (rnd() - 0.5) * 1.4, 0, 100);

      // reduz minutesSeason levemente (para não explodir pra sempre)
      st.minutesSeason = Math.max(0, n(st.minutesSeason, 0) - 40);

      // salva fitness se possível
      fitnessSet(p.id, fit);

      // registra mudanças relevantes
      const diff = after - before;
      if (Math.abs(diff) >= 0.02 || (fit.injuryWeeks > 0 && n(fit.injuryWeeks, 0) <= 4)) {
        changes.push({
          playerId: p.id,
          name: p.name || p.nome || `Jogador ${p.id}`,
          ovrBefore: Number(before.toFixed(2)),
          ovrAfter: Number(after.toFixed(2)),
          diff: Number(diff.toFixed(2)),
          morale: Math.round(st.morale),
          form: Math.round(st.form),
          injuryWeeks: n(fit.injuryWeeks, 0),
          fatigue: Math.round(n(fit.fatigue, 0))
        });
      }
    }

    // semana avança
    tr.week = n(tr.week, 1) + 1;
    tr.lastAppliedISO = nowISO();

    // log compacto
    const up = changes.filter(c => c.diff > 0.02).length;
    const down = changes.filter(c => c.diff < -0.02).length;
    const injured = changes.filter(c => c.injuryWeeks > 0).length;

    const summary = `Treino aplicado (Int ${plan.intensity} • ${plan.focus}). ↑${up} ↓${down} Lesões:${injured}`;
    tr.logs.unshift({ iso: tr.lastAppliedISO, teamId: tid, summary, up, down, injured, changes });
    tr.logs = tr.logs.slice(0, 25);

    news("Treino semanal", summary);
    save();

    return {
      ok: true,
      teamId: tid,
      plan,
      week: tr.week,
      summary,
      changes
    };
  }

  function getWeeklyReport(teamId) {
    const gs = ensureGS();
    const tr = gs.training;
    const tid = String(teamId);
    const log = (tr.logs || []).find(x => String(x.teamId) === tid) || null;
    return log ? JSON.parse(JSON.stringify(log)) : null;
  }

  // -----------------------------
  // Public API
  // -----------------------------
  window.Training = {
    ensure() {
      ensureGS();
      // garante plano do usuário
      const tid = (window.gameState && (window.gameState.currentTeamId || window.gameState.selectedTeamId)) || null;
      if (tid) getTeamPlan(tid);
    },
    getTeamPlan,
    setTeamPlan,
    getPlayerState,
    addMinutes,
    applyWeek,
    getWeeklyReport
  };
})();