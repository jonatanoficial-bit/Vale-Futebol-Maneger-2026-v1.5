/* ============================================================
   VALE FUTEBOL MANAGER 2026
   engine/tactics.js — TÁTICAS AAA (SM26-like)
   ------------------------------------------------------------
   Entrega:
   - Formação + titulares/reservas com fallback automático
   - Estilo/mentalidade + ritmo + pressão + linha defensiva + largura
   - Modificadores reais para a simulação de match (Match usa aqui)
   - Persistência em gameState.tactics + Game.formacao/Game.estilo

   Compatibilidade:
   - Mantém métodos usados antes:
     • ensureElencoETitulares()
     • getEscalacaoCompleta()
     • formatTitulares()
     • trocar(titularSlotIndex, reservaId)
     • atualizarFormacao(novaFormacao)
     • salvarTatica()
   ============================================================ */

(function () {
  console.log("%c[Tactics] tactics.js carregado (AAA)", "color:#22c55e; font-weight:bold;");

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function deepClone(x) { return JSON.parse(JSON.stringify(x)); }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.seasonYear) gs.seasonYear = 2026;

    if (!gs.tactics || typeof gs.tactics !== "object") gs.tactics = {};
    const tt = gs.tactics;

    if (!tt.byTeam || typeof tt.byTeam !== "object") tt.byTeam = {};
    if (!tt.lastSavedISO) tt.lastSavedISO = null;

    return gs;
  }

  function save() {
    try {
      if (typeof salvarJogo === "function") salvarJogo();
      else if (window.Save && typeof Save.salvar === "function") Save.salvar();
      else localStorage.setItem("vfm-save", JSON.stringify(window.gameState));
    } catch (e) {
      console.warn("[Tactics] Falha ao salvar:", e);
    }
  }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }

  function getPlayers() {
    return (window.Database && Array.isArray(Database.players)) ? Database.players : [];
  }

  function getPlayerById(id) {
    return getPlayers().find(p => String(p.id) === String(id)) || null;
  }

  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  function getTeamPlayers(teamId) {
    return getPlayers().filter(p => String(p.teamId) === String(teamId));
  }

  function getOVR(p) {
    return n(p.ovr ?? p.overall ?? p.OVR, 70);
  }

  function getPos(p) {
    return String(p.posicao || p.position || p.pos || "").toUpperCase();
  }

  // Mapeia qualquer posição do banco para nossos slots “BR”
  function normalizePosToSlot(pos) {
    const p = String(pos || "").toUpperCase();

    if (!p) return "MEI";
    if (p.includes("GK") || p.includes("GOL")) return "GOL";

    if (p.includes("LB") || p.includes("LE")) return "LE";
    if (p.includes("RB") || p.includes("LD")) return "LD";

    if (p.includes("CB") || p.includes("ZAG") || p.includes("DC")) return "ZAG";

    if (p.includes("DM") || p.includes("VOL")) return "VOL";

    if (p.includes("AM") || p.includes("MEI") || p.includes("CM") || p.includes("MC")) return "MEI";

    if (p.includes("ST") || p.includes("ATA") || p.includes("FW") || p.includes("CF")) return "ATA";

    return "MEI";
  }

  // -----------------------------
  // Formações (slots + coords)
  // -----------------------------
  const FORMATIONS = {
    "4-3-3": [
      { pos: "GOL", x: 50, y: 90 },
      { pos: "LD",  x: 20, y: 75 },
      { pos: "ZAG", x: 40, y: 72 },
      { pos: "ZAG", x: 60, y: 72 },
      { pos: "LE",  x: 80, y: 75 },
      { pos: "VOL", x: 50, y: 60 },
      { pos: "MEI", x: 35, y: 50 },
      { pos: "MEI", x: 65, y: 50 },
      { pos: "ATA", x: 22, y: 30 },
      { pos: "ATA", x: 50, y: 24 },
      { pos: "ATA", x: 78, y: 30 }
    ],
    "4-4-2": [
      { pos: "GOL", x: 50, y: 90 },
      { pos: "LD",  x: 20, y: 75 },
      { pos: "ZAG", x: 40, y: 72 },
      { pos: "ZAG", x: 60, y: 72 },
      { pos: "LE",  x: 80, y: 75 },
      { pos: "MEI", x: 20, y: 50 },
      { pos: "VOL", x: 40, y: 55 },
      { pos: "MEI", x: 60, y: 55 },
      { pos: "MEI", x: 80, y: 50 },
      { pos: "ATA", x: 40, y: 28 },
      { pos: "ATA", x: 60, y: 28 }
    ],
    "4-2-3-1": [
      { pos: "GOL", x: 50, y: 90 },
      { pos: "LD",  x: 20, y: 75 },
      { pos: "ZAG", x: 40, y: 72 },
      { pos: "ZAG", x: 60, y: 72 },
      { pos: "LE",  x: 80, y: 75 },
      { pos: "VOL", x: 40, y: 60 },
      { pos: "VOL", x: 60, y: 60 },
      { pos: "MEI", x: 20, y: 45 },
      { pos: "MEI", x: 50, y: 42 },
      { pos: "MEI", x: 80, y: 45 },
      { pos: "ATA", x: 50, y: 26 }
    ],
    "3-5-2": [
      { pos: "GOL", x: 50, y: 90 },
      { pos: "ZAG", x: 30, y: 75 },
      { pos: "ZAG", x: 50, y: 72 },
      { pos: "ZAG", x: 70, y: 75 },
      { pos: "LD",  x: 18, y: 52 },
      { pos: "LE",  x: 82, y: 52 },
      { pos: "VOL", x: 50, y: 60 },
      { pos: "MEI", x: 35, y: 48 },
      { pos: "MEI", x: 65, y: 48 },
      { pos: "ATA", x: 42, y: 28 },
      { pos: "ATA", x: 58, y: 28 }
    ]
  };

  const DEFAULT_SETTINGS = {
    formacao: "4-3-3",
    estilo: "equilibrado",       // ofensivo | equilibrado | defensivo
    mentalidade: "equilibrada",  // ultra_ofensiva | ofensiva | equilibrada | cautelosa | ultra_defensiva
    ritmo: 3,                    // 1..5
    pressao: 3,                  // 1..5
    linhaDefensiva: 3,           // 1..5
    largura: 3                   // 1..5
  };

  function ensureTeamTactics(teamId) {
    const gs = ensureGS();
    const tt = gs.tactics;
    const tid = String(teamId);

    if (!tt.byTeam[tid]) tt.byTeam[tid] = {};

    const obj = tt.byTeam[tid];

    // sincroniza com Game (se for o usuário)
    if (window.Game && String(Game.teamId) === tid) {
      if (Game.formacao) obj.formacao = Game.formacao;
      if (Game.estilo) obj.estilo = Game.estilo;
    }

    // aplica defaults
    obj.formacao = String(obj.formacao || DEFAULT_SETTINGS.formacao);
    if (!FORMATIONS[obj.formacao]) obj.formacao = DEFAULT_SETTINGS.formacao;

    obj.estilo = String(obj.estilo || DEFAULT_SETTINGS.estilo).toLowerCase();
    if (!["ofensivo", "equilibrado", "defensivo"].includes(obj.estilo)) obj.estilo = DEFAULT_SETTINGS.estilo;

    obj.mentalidade = String(obj.mentalidade || DEFAULT_SETTINGS.mentalidade).toLowerCase();
    if (!["ultra_ofensiva","ofensiva","equilibrada","cautelosa","ultra_defensiva"].includes(obj.mentalidade)) obj.mentalidade = DEFAULT_SETTINGS.mentalidade;

    obj.ritmo = clamp(n(obj.ritmo, DEFAULT_SETTINGS.ritmo), 1, 5);
    obj.pressao = clamp(n(obj.pressao, DEFAULT_SETTINGS.pressao), 1, 5);
    obj.linhaDefensiva = clamp(n(obj.linhaDefensiva, DEFAULT_SETTINGS.linhaDefensiva), 1, 5);
    obj.largura = clamp(n(obj.largura, DEFAULT_SETTINGS.largura), 1, 5);

    return obj;
  }

  function setTeamSetting(teamId, patch) {
    const obj = ensureTeamTactics(teamId);
    Object.assign(obj, patch || {});
    ensureTeamTactics(teamId); // re-normaliza

    // espelha no Game se for o usuário
    if (window.Game && String(Game.teamId) === String(teamId)) {
      if (obj.formacao) Game.formacao = obj.formacao;
      if (obj.estilo) Game.estilo = obj.estilo;
    }

    save();
    return deepClone(obj);
  }

  // -----------------------------
  // Escalação: titulares / reservas
  // -----------------------------
  function ensureElencoETitulares() {
    const gs = ensureGS();
    const teamId = getUserTeamId();
    if (!teamId) return;

    // elenco e titulares no gameState (compat)
    if (!Array.isArray(gs.elenco)) gs.elenco = [];
    if (!Array.isArray(gs.titulares)) gs.titulares = [];
    if (!Array.isArray(gs.reservas)) gs.reservas = [];

    // se elenco vazio, preenche com players do Database do time do usuário
    if (gs.elenco.length === 0) {
      gs.elenco = getTeamPlayers(teamId).map(p => ({
        id: p.id,
        nome: p.name || p.nome || `Jogador ${p.id}`,
        pos: normalizePosToSlot(getPos(p)),
        overall: getOVR(p)
      }));
    }

    // se titulares vazio, monta titulares melhores por slot da formação atual
    const tac = ensureTeamTactics(teamId);
    const formation = FORMATIONS[tac.formacao] || FORMATIONS["4-3-3"];

    if (gs.titulares.length === 0) {
      const used = new Set();

      gs.titulares = formation.map(slot => {
        const desired = slot.pos;
        let best = null;
        let bestScore = -999;

        for (const p of gs.elenco) {
          if (used.has(String(p.id))) continue;
          const pos = String(p.pos || "").toUpperCase();
          const ovr = n(p.overall, 70);

          // score por match de posição + ovr
          let score = ovr;
          if (pos === desired) score += 25;
          else if ((desired === "MEI" && (pos === "VOL")) || (desired === "VOL" && pos === "MEI")) score += 10;
          else if ((desired === "ZAG" && (pos === "LD" || pos === "LE")) || ((desired === "LD" || desired === "LE") && pos === "ZAG")) score += 6;
          else score -= 8;

          if (score > bestScore) { bestScore = score; best = p; }
        }

        if (best) used.add(String(best.id));

        return {
          pos: desired,
          x: slot.x,
          y: slot.y,
          playerId: best ? best.id : null
        };
      });
    } else {
      // se existe mas formação mudou (slots diferentes), reconstrói preservando ids
      const current = gs.titulares.slice();
      if (current.length !== formation.length) {
        const keep = current.map(s => s.playerId).filter(Boolean);
        const used = new Set(keep.map(String));

        gs.titulares = formation.map((slot, i) => {
          return {
            pos: slot.pos,
            x: slot.x,
            y: slot.y,
            playerId: keep[i] || null
          };
        });

        // preenche vazios com melhores disponíveis
        for (const s of gs.titulares) {
          if (s.playerId) continue;
          let best = null;
          let bestScore = -999;
          for (const p of gs.elenco) {
            if (used.has(String(p.id))) continue;
            const pos = String(p.pos || "").toUpperCase();
            const ovr = n(p.overall, 70);
            let score = ovr + (pos === s.pos ? 22 : -3);
            if (score > bestScore) { bestScore = score; best = p; }
          }
          if (best) { s.playerId = best.id; used.add(String(best.id)); }
        }
      }
    }

    // reservas: quem não está nos titulares
    const titularesIds = new Set(gs.titulares.map(s => String(s.playerId)).filter(Boolean));
    gs.reservas = gs.elenco
      .filter(p => !titularesIds.has(String(p.id)))
      .sort((a, b) => n(b.overall, 0) - n(a.overall, 0))
      .slice(0, 12);

    save();
  }

  function getEscalacaoCompleta() {
    const gs = ensureGS();
    ensureElencoETitulares();
    const teamId = getUserTeamId();
    const tac = ensureTeamTactics(teamId);

    return {
      teamId,
      tactics: deepClone(tac),
      titulares: deepClone(gs.titulares || []),
      reservas: deepClone(gs.reservas || []),
      elenco: deepClone(gs.elenco || [])
    };
  }

  function formatTitulares() {
    const gs = ensureGS();
    ensureElencoETitulares();

    const mapElenco = new Map((gs.elenco || []).map(p => [String(p.id), p]));
    const tit = (gs.titulares || []).map(s => {
      const p = mapElenco.get(String(s.playerId));
      return {
        pos: s.pos,
        x: s.x, y: s.y,
        playerId: s.playerId,
        nome: p ? (p.nome || p.name || `Jogador ${s.playerId}`) : "—",
        overall: p ? n(p.overall, 70) : 0
      };
    });

    return tit;
  }

  // troca: coloca reserva no slot do titular
  function trocar(titularSlotIndex, reservaId) {
    const gs = ensureGS();
    ensureElencoETitulares();

    const idx = n(titularSlotIndex, -1);
    if (idx < 0 || idx >= (gs.titulares || []).length) return false;

    const resId = String(reservaId);
    const res = (gs.elenco || []).find(p => String(p.id) === resId);
    if (!res) return false;

    const oldTitId = gs.titulares[idx].playerId;
    gs.titulares[idx].playerId = res.id;

    // re-monta reservas
    const titularesIds = new Set(gs.titulares.map(s => String(s.playerId)).filter(Boolean));
    gs.reservas = gs.elenco
      .filter(p => !titularesIds.has(String(p.id)))
      .sort((a, b) => n(b.overall, 0) - n(a.overall, 0))
      .slice(0, 12);

    save();
    return { oldTitId, newTitId: res.id };
  }

  function atualizarFormacao(novaFormacao) {
    if (!novaFormacao || !FORMATIONS[novaFormacao]) return;
    const teamId = getUserTeamId();
    if (!teamId) return;

    // atualiza game + state tática
    if (!window.Game) window.Game = {};
    Game.formacao = novaFormacao;

    setTeamSetting(teamId, { formacao: novaFormacao });

    // limpa titulares para rebuild coerente
    if (window.gameState && Array.isArray(window.gameState.titulares)) {
      window.gameState.titulares = [];
    }
    ensureElencoETitulares();
  }

  function salvarTatica() {
    const gs = ensureGS();
    const teamId = getUserTeamId();
    if (!teamId) return;

    ensureElencoETitulares();

    // salva settings atuais
    const obj = ensureTeamTactics(teamId);
    gs.tactics.lastSavedISO = new Date().toISOString();
    gs.tactics.byTeam[String(teamId)] = obj;

    save();
    console.log("[Tactics] Tática salva com sucesso");
  }

  // -----------------------------
  // Modificadores para Match (impacto real)
  // -----------------------------
  function getMatchModifiers(teamId) {
    const tid = String(teamId);
    const tac = ensureTeamTactics(tid);

    // base de mentalidade -> ataque/defesa
    const mentalityMap = {
      ultra_ofensiva: { atk: 1.12, def: 0.92, risk: 1.14 },
      ofensiva:       { atk: 1.07, def: 0.96, risk: 1.08 },
      equilibrada:    { atk: 1.00, def: 1.00, risk: 1.00 },
      cautelosa:      { atk: 0.95, def: 1.06, risk: 0.95 },
      ultra_defensiva:{ atk: 0.90, def: 1.12, risk: 0.90 }
    };

    const styleMap = {
      ofensivo: { atk: 1.05, def: 0.98, risk: 1.05 },
      equilibrado: { atk: 1.00, def: 1.00, risk: 1.00 },
      defensivo: { atk: 0.96, def: 1.05, risk: 0.96 }
    };

    const m = mentalityMap[tac.mentalidade] || mentalityMap.equilibrada;
    const s = styleMap[tac.estilo] || styleMap.equilibrado;

    // ritmo aumenta volume de chances (para os dois lados) e aumenta desgaste
    const tempo = clamp(n(tac.ritmo, 3), 1, 5);
    const tempoMul = clamp(0.92 + (tempo - 1) * 0.04, 0.92, 1.08); // 1..5 -> 0.92..1.08

    // pressão aumenta recuperação de bola (atk) mas expõe defesa (risk)
    const press = clamp(n(tac.pressao, 3), 1, 5);
    const pressAtk = clamp(0.96 + (press - 1) * 0.03, 0.96, 1.08);
    const pressRisk = clamp(0.95 + (press - 1) * 0.03, 0.95, 1.07);

    // linha defensiva alta aumenta risco contra bolas nas costas
    const line = clamp(n(tac.linhaDefensiva, 3), 1, 5);
    const lineDef = clamp(1.04 - (line - 1) * 0.02, 0.96, 1.04);
    const lineRisk = clamp(0.96 + (line - 1) * 0.03, 0.96, 1.08);

    // largura influencia ataque (cruzamentos) e defesa lateral
    const width = clamp(n(tac.largura, 3), 1, 5);
    const widthAtk = clamp(0.98 + (width - 1) * 0.02, 0.98, 1.06);
    const widthDef = clamp(1.02 - (width - 1) * 0.01, 0.98, 1.02);

    const attackMul = m.atk * s.atk * pressAtk * widthAtk;
    const defenseMul = m.def * s.def * lineDef * widthDef;

    // risk multiplica chances concedidas
    const riskMul = m.risk * s.risk * pressRisk * lineRisk;

    return {
      attackMul: Number(attackMul.toFixed(3)),
      defenseMul: Number(defenseMul.toFixed(3)),
      tempoMul: Number(tempoMul.toFixed(3)),
      riskMul: Number(riskMul.toFixed(3)),
      snapshot: deepClone(tac)
    };
  }

  // -----------------------------
  // Public API
  // -----------------------------
  window.Tactics = {
    FORMATIONS,
    DEFAULT_SETTINGS,

    // compat
    ensureElencoETitulares,
    getEscalacaoCompleta,
    formatTitulares,
    trocar,
    atualizarFormacao,
    salvarTatica,

    // novo
    getTeamTactics(teamId) { return deepClone(ensureTeamTactics(teamId)); },
    setTeamTactics(teamId, patch) { return setTeamSetting(teamId, patch); },
    getMatchModifiers
  };
})();