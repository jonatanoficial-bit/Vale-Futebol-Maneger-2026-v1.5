/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/training.js — Treino Semanal AAA (Engine + UI Modal)
   -----------------------------------------------------------
   Objetivo:
   - Criar um sistema de treino com foco e intensidade
   - Aplicar efeitos em moral/forma/fadiga (Dynamics)
   - Gerar notícias no feed (News)
   - Injetar botão TREINO no lobby sem alterar HTML dos botões

   Persistência:
   gameState.training = {
     focus: "EQUILIBRADO" | "FISICO" | "TATICO" | "OFENSIVO" | "DEFENSIVO",
     intensity: 1|2|3,
     lastAppliedAt: ISO string
   }

   Aplicação:
   - Botão "APLICAR SESSÃO" aplica agora (simula semana de treino)
   - Modificações por intensidade:
     Forma: +, Moral: +/-, Fadiga: + (se treino pesado)
   =======================================================*/

(function () {
  console.log("%c[Training] training.js carregado", "color:#F59E0B; font-weight:bold;");

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.training || typeof gs.training !== "object") {
      gs.training = {
        focus: "EQUILIBRADO",
        intensity: 2,
        lastAppliedAt: null
      };
    }
    if (!gs.playerStates || typeof gs.playerStates !== "object") gs.playerStates = {};
    return gs;
  }

  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  function getPlayers() {
    return (window.Database && Array.isArray(Database.players)) ? Database.players : [];
  }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }

  function getTeamName(teamId) {
    const t = getTeams().find(x => String(x.id) === String(teamId));
    return t?.name || teamId;
  }

  function getElenco(teamId) {
    return getPlayers().filter(p => String(p.teamId) === String(teamId));
  }

  function ensurePlayerState(pid) {
    const gs = ensureGS();
    const id = String(pid || "");
    if (!id) return null;

    if (!gs.playerStates[id]) {
      gs.playerStates[id] = { morale: 55, form: 55, fatigue: 10 };
    }

    const st = gs.playerStates[id];
    st.morale = clamp(n(st.morale, 55), 0, 100);
    st.form = clamp(n(st.form, 55), 0, 100);
    st.fatigue = clamp(n(st.fatigue, 10), 0, 100);
    return st;
  }

  function nowIso() {
    try { return new Date().toISOString(); } catch (e) { return ""; }
  }

  // Regras de impacto (balanceadas para "sentir" no elenco sem quebrar rápido)
  // Intensity: 1 (leve), 2 (normal), 3 (pesado)
  function getDeltas(focus, intensity) {
    const I = clamp(Math.floor(n(intensity, 2)), 1, 3);

    // base por intensidade
    const baseForm = (I === 1 ? 2 : (I === 2 ? 4 : 6));
    const baseMorale = (I === 1 ? 1 : (I === 2 ? 2 : 2)); // moral não escala tanto
    const baseFatigue = (I === 1 ? 2 : (I === 2 ? 5 : 9));

    // foco ajusta
    // OBS: fadiga sobe mais no físico e no pesado; moral sobe no tático quando time está “alinhado”
    let dForm = baseForm;
    let dMorale = baseMorale;
    let dFat = baseFatigue;

    switch (String(focus || "EQUILIBRADO").toUpperCase()) {
      case "FISICO":
        dForm += 1;
        dFat += 3; // pesado
        dMorale -= (I === 3 ? 1 : 0); // pode irritar
        break;

      case "TATICO":
        dForm += 2;
        dFat -= 1; // menos exaustivo
        dMorale += 1;
        break;

      case "OFENSIVO":
        dForm += 2;
        dFat += 1;
        dMorale += 0;
        break;

      case "DEFENSIVO":
        dForm += 2;
        dFat += 1;
        dMorale += 0;
        break;

      default: // EQUILIBRADO
        dForm += 1;
        dFat += 0;
        break;
    }

    // limita valores
    dForm = clamp(dForm, 1, 10);
    dMorale = clamp(dMorale, -3, 6);
    dFat = clamp(dFat, 0, 14);

    return { dForm, dMorale, dFat };
  }

  function applyTrainingSession() {
    const gs = ensureGS();
    const teamId = getUserTeamId();
    if (!teamId) { alert("Nenhum time selecionado."); return null; }

    // Garante Dynamics e News se existirem
    try { if (window.Dynamics && typeof Dynamics.ensure === "function") Dynamics.ensure(); } catch (e) {}
    try { if (window.News && typeof News.ensure === "function") News.ensure(); } catch (e) {}

    const focus = gs.training.focus || "EQUILIBRADO";
    const intensity = gs.training.intensity || 2;

    const { dForm, dMorale, dFat } = getDeltas(focus, intensity);

    const elenco = getElenco(teamId);
    if (!elenco.length) { alert("Elenco vazio."); return null; }

    let highFatigue = 0;
    let lowMorale = 0;

    for (const p of elenco) {
      const pid = String(p.id || p.playerId || "");
      if (!pid) continue;

      const st = ensurePlayerState(pid);
      if (!st) continue;

      // jogadores já muito cansados sofrem mais fadiga e ganham menos forma
      const tiredFactor = st.fatigue >= 75 ? 0.6 : (st.fatigue >= 60 ? 0.8 : 1.0);

      const formGain = Math.round(dForm * tiredFactor);
      const moraleGain = dMorale; // moral não reduz tanto com cansaço
      const fatigueGain = (st.fatigue >= 80) ? (dFat + 2) : dFat;

      st.form = clamp(st.form + formGain, 0, 100);
      st.morale = clamp(st.morale + moraleGain, 0, 100);
      st.fatigue = clamp(st.fatigue + fatigueGain, 0, 100);

      if (st.fatigue >= 78) highFatigue++;
      if (st.morale <= 35) lowMorale++;
    }

    gs.training.lastAppliedAt = nowIso();

    // notícia
    try {
      if (window.News && typeof News.pushNews === "function") {
        const tn = getTeamName(teamId);
        const intensityLabel = (intensity === 1 ? "LEVE" : (intensity === 2 ? "NORMAL" : "PESADO"));
        News.pushNews(
          "Sessão de treino concluída",
          `${tn} treinou (${String(focus).toUpperCase()} • ${intensityLabel}). Efeito: +Forma, ${dMorale >= 0 ? "+" : ""}${dMorale} Moral, +Fadiga. Alertas: ${highFatigue} muito cansados, ${lowMorale} com moral baixa.`,
          "TRAINING"
        );
      }
    } catch (e) {}

    return { focus, intensity, dForm, dMorale, dFat, highFatigue, lowMorale };
  }

  // -----------------------------
  // UI MODAL (injetado no lobby)
  // -----------------------------
  function injectLobbyButton() {
    // já existe?
    if (document.getElementById("btn-training-open")) return;

    const wrap = document.querySelector(".lobby-botoes");
    if (!wrap) return;

    const btn = document.createElement("button");
    btn.id = "btn-training-open";
    btn.className = "btn-blue";
    btn.textContent = "TREINO";
    btn.onclick = () => openModal();
    // coloca antes do salvar
    const buttons = Array.from(wrap.querySelectorAll("button"));
    const saveBtn = buttons.find(b => (b.textContent || "").toUpperCase().includes("SALVAR"));
    if (saveBtn && saveBtn.parentElement === wrap) {
      wrap.insertBefore(btn, saveBtn);
    } else {
      wrap.appendChild(btn);
    }
  }

  function injectModal() {
    if (document.getElementById("training-modal-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "training-modal-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.background = "rgba(0,0,0,0.68)";
    overlay.style.display = "none";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "9999";
    overlay.onclick = (e) => {
      if (e.target === overlay) closeModal();
    };

    const card = document.createElement("div");
    card.style.width = "min(520px, 92vw)";
    card.style.background = "rgba(10,10,10,0.92)";
    card.style.border = "1px solid rgba(255,255,255,0.10)";
    card.style.borderRadius = "18px";
    card.style.padding = "14px";
    card.style.boxShadow = "0 0 28px rgba(0,0,0,0.75)";
    card.style.fontFamily = "Roboto, Arial, sans-serif";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.justifyContent = "space-between";
    header.style.alignItems = "center";
    header.style.gap = "10px";

    const title = document.createElement("div");
    title.textContent = "TREINO SEMANAL";
    title.style.fontWeight = "900";
    title.style.letterSpacing = "0.8px";
    title.style.fontSize = "14px";

    const close = document.createElement("button");
    close.textContent = "X";
    close.className = "btn-blue";
    close.style.padding = "6px 10px";
    close.onclick = () => closeModal();

    header.appendChild(title);
    header.appendChild(close);

    const sub = document.createElement("div");
    sub.id = "training-sub";
    sub.style.marginTop = "8px";
    sub.style.opacity = "0.85";
    sub.style.fontSize = "12px";
    sub.textContent = "Configure foco e intensidade. Depois aplique uma sessão (simula uma semana).";

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "1fr 1fr";
    grid.style.gap = "10px";
    grid.style.marginTop = "12px";

    // Focus
    const focusWrap = document.createElement("div");
    const focusLab = document.createElement("div");
    focusLab.textContent = "FOCO";
    focusLab.style.fontWeight = "900";
    focusLab.style.fontSize = "11px";
    focusLab.style.opacity = "0.75";
    focusLab.style.marginBottom = "6px";

    const focusSel = document.createElement("select");
    focusSel.id = "training-focus";
    ["EQUILIBRADO","FISICO","TATICO","OFENSIVO","DEFENSIVO"].forEach(v => {
      const o = document.createElement("option");
      o.value = v; o.textContent = v;
      focusSel.appendChild(o);
    });
    focusSel.style.width = "100%";
    focusSel.style.padding = "10px";
    focusSel.style.borderRadius = "12px";
    focusSel.style.border = "1px solid rgba(255,255,255,0.10)";
    focusSel.style.background = "rgba(0,0,0,0.35)";
    focusSel.style.color = "white";
    focusSel.style.fontWeight = "900";

    focusWrap.appendChild(focusLab);
    focusWrap.appendChild(focusSel);

    // Intensity
    const intWrap = document.createElement("div");
    const intLab = document.createElement("div");
    intLab.textContent = "INTENSIDADE";
    intLab.style.fontWeight = "900";
    intLab.style.fontSize = "11px";
    intLab.style.opacity = "0.75";
    intLab.style.marginBottom = "6px";

    const intSel = document.createElement("select");
    intSel.id = "training-intensity";
    [
      { v: 1, t: "1 • LEVE (menos fadiga)" },
      { v: 2, t: "2 • NORMAL (balanceado)" },
      { v: 3, t: "3 • PESADO (mais forma, mais fadiga)" }
    ].forEach(obj => {
      const o = document.createElement("option");
      o.value = String(obj.v);
      o.textContent = obj.t;
      intSel.appendChild(o);
    });
    intSel.style.width = "100%";
    intSel.style.padding = "10px";
    intSel.style.borderRadius = "12px";
    intSel.style.border = "1px solid rgba(255,255,255,0.10)";
    intSel.style.background = "rgba(0,0,0,0.35)";
    intSel.style.color = "white";
    intSel.style.fontWeight = "900";

    intWrap.appendChild(intLab);
    intWrap.appendChild(intSel);

    grid.appendChild(focusWrap);
    grid.appendChild(intWrap);

    const preview = document.createElement("div");
    preview.id = "training-preview";
    preview.style.marginTop = "12px";
    preview.style.padding = "10px";
    preview.style.borderRadius = "14px";
    preview.style.border = "1px solid rgba(255,255,255,0.08)";
    preview.style.background = "rgba(255,255,255,0.04)";
    preview.style.fontSize = "12px";
    preview.style.opacity = "0.9";
    preview.textContent = "Efeito estimado: —";

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "10px";
    actions.style.marginTop = "12px";

    const btnSave = document.createElement("button");
    btnSave.className = "btn-blue";
    btnSave.textContent = "SALVAR CONFIG";
    btnSave.onclick = () => {
      const gs = ensureGS();
      gs.training.focus = focusSel.value;
      gs.training.intensity = parseInt(intSel.value, 10) || 2;
      updatePreview();
      alert("Configuração de treino salva!");
    };

    const btnApply = document.createElement("button");
    btnApply.className = "btn-green";
    btnApply.textContent = "APLICAR SESSÃO";
    btnApply.onclick = () => {
      const gs = ensureGS();
      gs.training.focus = focusSel.value;
      gs.training.intensity = parseInt(intSel.value, 10) || 2;

      const res = applyTrainingSession();
      if (!res) return;

      // feedback
      alert(
        `Treino aplicado!\nFoco: ${res.focus}\nIntensidade: ${res.intensity}\n\nEfeitos:\n+Forma: ${res.dForm}\nMoral: ${res.dMorale >= 0 ? "+" : ""}${res.dMorale}\n+Fadiga: ${res.dFat}\n\nAlertas:\nCansados: ${res.highFatigue}\nMoral baixa: ${res.lowMorale}`
      );

      // volta para lobby já atualizado (se existir)
      try { if (window.UI && typeof UI.voltarLobby === "function") UI.voltarLobby(); } catch (e) {}
      closeModal();
    };

    actions.appendChild(btnSave);
    actions.appendChild(btnApply);

    const footer = document.createElement("div");
    footer.id = "training-footer";
    footer.style.marginTop = "10px";
    footer.style.fontSize = "11px";
    footer.style.opacity = "0.75";
    footer.textContent = "Dica: use PESADO em pré-temporada e LEVE antes de jogos decisivos.";

    card.appendChild(header);
    card.appendChild(sub);
    card.appendChild(grid);
    card.appendChild(preview);
    card.appendChild(actions);
    card.appendChild(footer);

    overlay.appendChild(card);
    document.body.appendChild(overlay);

    function updatePreview() {
      const focus = focusSel.value;
      const intensity = parseInt(intSel.value, 10) || 2;
      const d = getDeltas(focus, intensity);

      const intensityLabel = (intensity === 1 ? "LEVE" : (intensity === 2 ? "NORMAL" : "PESADO"));
      const m = `${d.dMorale >= 0 ? "+" : ""}${d.dMorale}`;
      preview.textContent = `Efeito estimado: +Forma ${d.dForm} • Moral ${m} • +Fadiga ${d.dFat}  (${focus} • ${intensityLabel})`;
    }

    focusSel.onchange = updatePreview;
    intSel.onchange = updatePreview;

    // sincroniza estado atual
    const gs = ensureGS();
    focusSel.value = gs.training.focus || "EQUILIBRADO";
    intSel.value = String(gs.training.intensity || 2);
    updatePreview();
  }

  function openModal() {
    ensureGS();
    injectModal();
    const ov = document.getElementById("training-modal-overlay");
    if (ov) ov.style.display = "flex";
  }

  function closeModal() {
    const ov = document.getElementById("training-modal-overlay");
    if (ov) ov.style.display = "none";
  }

  function init() {
    ensureGS();

    // garante contracts/dynamics/news se existirem
    try { if (window.Contracts && typeof Contracts.ensure === "function") Contracts.ensure(); } catch (e) {}
    try { if (window.Dynamics && typeof Dynamics.ensure === "function") Dynamics.ensure(); } catch (e) {}
    try { if (window.News && typeof News.ensure === "function") News.ensure(); } catch (e) {}

    // injeta botão quando lobby existir
    injectLobbyButton();

    // tenta reinjetar algumas vezes (caso carregue depois)
    let tries = 0;
    const t = setInterval(() => {
      tries++;
      injectLobbyButton();
      if (document.getElementById("btn-training-open") || tries > 20) clearInterval(t);
    }, 500);
  }

  document.addEventListener("DOMContentLoaded", init);

  window.Training = {
    ensure: ensureGS,
    applySession: applyTrainingSession,
    open: openModal,
    close: closeModal
  };
})();