/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/team-ui.js — Seleção de time + Elenco AAA
   =======================================================*/

(function () {
  console.log("%c[TEAM-UI] team-ui.js AAA carregado", "color:#a855f7; font-weight:bold;");

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }

  function getPlayers() {
    return (window.Database && Array.isArray(Database.players)) ? Database.players : [];
  }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    return window.gameState;
  }

  function getCurrentTeamId() {
    const gs = ensureGS();
    return gs.selectedTeamId || gs.currentTeamId || (window.Game ? Game.teamId : null);
  }

  function clear(el) {
    if (!el) return;
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function el(tag, cls, text) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (text != null) d.textContent = text;
    return d;
  }

  function normNameToFaceKey(name) {
    return String(name || "")
      .trim()
      .toUpperCase()
      .replace(/[ÁÀÂÃ]/g, "A")
      .replace(/[ÉÈÊ]/g, "E")
      .replace(/[ÍÌÎ]/g, "I")
      .replace(/[ÓÒÔÕ]/g, "O")
      .replace(/[ÚÙÛ]/g, "U")
      .replace(/[Ç]/g, "C")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  // Estratégia de face:
  // 1) se player.face existir -> usa
  // 2) tenta assets/face/{TEAMID}_{KEY}.png (ex: FLA_GABIGOL.png)
  // 3) tenta assets/face/{player.id}.png (fallback antigo)
  function getFacePath(player, teamId) {
    if (player && player.face) return player.face;

    const nameKey = normNameToFaceKey(player?.faceKey || player?.apelido || player?.nickname || player?.name || player?.nome);
    if (teamId && nameKey) return `assets/face/${teamId}_${nameKey}.png`;
    if (player && player.id) return `assets/face/${player.id}.png`;
    return "";
  }

  function getPlayerState(pid) {
    if (window.Dynamics && typeof Dynamics.getPlayerState === "function") return Dynamics.getPlayerState(pid);
    const gs = ensureGS();
    if (!gs.playerStates) return null;
    return gs.playerStates[String(pid)] || null;
  }

  /* =======================================================
     SELEÇÃO DE TIME (tela-escolha-time)
     =======================================================*/
  function renderTeamSelection() {
    const container = document.getElementById("lista-times");
    if (!container) {
      console.warn("[TEAM-UI] #lista-times não encontrado.");
      return;
    }
    clear(container);

    const teams = getTeams();
    if (!teams.length) {
      container.appendChild(el("div", "", "Sem times no banco de dados."));
      return;
    }

    teams.forEach((t) => {
      const card = el("div", "team-card");
      const img = document.createElement("img");
      img.src = `assets/logos/${t.id}.png`;
      img.alt = t.name || t.id;
      img.onerror = () => { img.src = "assets/logos/default.png"; };

      const name = el("div", "team-name", t.name || t.id);
      const meta = el("div", "team-meta", `Série ${t.division || t.serie || "A"}`);

      card.appendChild(img);
      card.appendChild(name);
      card.appendChild(meta);

      card.onclick = () => {
        const gs = ensureGS();
        gs.selectedTeamId = t.id;
        gs.currentTeamId = t.id;
        if (window.Game) Game.teamId = t.id;

        // inicia estruturas de Dynamics/News
        if (window.Dynamics && typeof Dynamics.ensure === "function") Dynamics.ensure();
        if (window.News && typeof News.ensure === "function") News.ensure();

        // primeira notícia
        if (window.News && typeof News.pushNews === "function") {
          News.pushNews("Carreira iniciada", `Você assumiu o comando do ${t.name || t.id}. Boa sorte!`, "SYSTEM");
        }

        // volta ao lobby
        if (window.UI && typeof UI.voltarLobby === "function") UI.voltarLobby();
      };

      container.appendChild(card);
    });
  }

  /* =======================================================
     ELENCO AAA (tela-elenco)
     =======================================================*/
  function renderTeamSquad() {
    const container = document.getElementById("lista-elenco");
    if (!container) {
      console.warn("[TEAM-UI] #lista-elenco não encontrado.");
      return;
    }
    clear(container);

    const teamId = getCurrentTeamId();
    if (!teamId) {
      container.appendChild(el("div", "", "Nenhum time selecionado."));
      return;
    }

    if (window.Dynamics && typeof Dynamics.ensure === "function") Dynamics.ensure();

    const elenco = getPlayers().filter(p => p.teamId === teamId);
    if (!elenco.length) {
      container.appendChild(el("div", "", "Nenhum jogador encontrado para este time."));
      return;
    }

    // ordena por overall
    elenco.sort((a, b) => (Number(b.ovr || b.overall || 0) - Number(a.ovr || a.overall || 0)));

    // estilo simples AAA inline para não depender de CSS novo
    container.style.display = "grid";
    container.style.gridTemplateColumns = "repeat(auto-fit, minmax(260px, 1fr))";
    container.style.gap = "12px";

    elenco.forEach((p) => {
      const pid = String(p.id || p.playerId || "");
      const st = getPlayerState(pid) || { morale: 55, form: 55, fatigue: 10 };

      const card = el("div", "");
      card.style.background = "rgba(10,10,10,0.82)";
      card.style.border = "1px solid rgba(255,255,255,0.08)";
      card.style.borderRadius = "16px";
      card.style.padding = "10px";
      card.style.display = "grid";
      card.style.gridTemplateColumns = "58px 1fr";
      card.style.gap = "10px";
      card.style.alignItems = "center";
      card.style.boxShadow = "0 0 18px rgba(0,0,0,0.55)";

      const img = document.createElement("img");
      img.style.width = "58px";
      img.style.height = "58px";
      img.style.objectFit = "cover";
      img.style.borderRadius = "12px";
      img.style.background = "rgba(255,255,255,0.05)";
      img.style.border = "1px solid rgba(255,255,255,0.06)";
      img.src = getFacePath(p, teamId);
      img.onerror = () => { img.style.display = "none"; };

      const right = el("div", "");

      const top = el("div", "");
      top.style.display = "flex";
      top.style.justifyContent = "space-between";
      top.style.alignItems = "center";
      top.style.gap = "10px";

      const name = el("div", "");
      name.style.fontWeight = "900";
      name.style.fontSize = "14px";
      name.style.whiteSpace = "nowrap";
      name.style.overflow = "hidden";
      name.style.textOverflow = "ellipsis";
      name.textContent = p.name || p.nome || "Jogador";

      const ovr = el("div", "");
      ovr.style.fontWeight = "900";
      ovr.style.padding = "6px 8px";
      ovr.style.borderRadius = "999px";
      ovr.style.background = "rgba(34,197,94,0.12)";
      ovr.style.border = "1px solid rgba(34,197,94,0.35)";
      ovr.style.fontSize = "12px";
      ovr.textContent = `OVR ${Number(p.ovr || p.overall || 0)}`;

      top.appendChild(name);
      top.appendChild(ovr);

      const mid = el("div", "");
      mid.style.display = "flex";
      mid.style.justifyContent = "space-between";
      mid.style.opacity = "0.85";
      mid.style.fontSize = "12px";
      mid.style.marginTop = "4px";
      mid.textContent = `${(p.pos || p.position || "POS")} • ${p.age ? (p.age + " anos") : ""}`.trim();

      const bars = el("div", "");
      bars.style.display = "grid";
      bars.style.gridTemplateColumns = "1fr 1fr 1fr";
      bars.style.gap = "6px";
      bars.style.marginTop = "8px";

      function mini(label, value, kind) {
        const box = el("div", "");
        box.style.padding = "6px 8px";
        box.style.borderRadius = "12px";
        box.style.background = "rgba(255,255,255,0.04)";
        box.style.border = "1px solid rgba(255,255,255,0.06)";

        const a = el("div", "", label);
        a.style.fontSize = "10px";
        a.style.fontWeight = "900";
        a.style.opacity = "0.75";

        const b = el("div", "", String(value));
        b.style.fontSize = "12px";
        b.style.fontWeight = "900";

        // destaque por condição
        if (kind === "fatigue" && value >= 78) b.style.color = "#ffb020";
        if (kind === "morale" && value <= 35) b.style.color = "#ff5a5a";
        if (kind === "form" && value >= 75) b.style.color = "#22c55e";

        box.appendChild(a);
        box.appendChild(b);
        return box;
      }

      bars.appendChild(mini("MORAL", Math.round(st.morale ?? 55), "morale"));
      bars.appendChild(mini("FORMA", Math.round(st.form ?? 55), "form"));
      bars.appendChild(mini("FADIGA", Math.round(st.fatigue ?? 10), "fatigue"));

      right.appendChild(top);
      right.appendChild(mid);
      right.appendChild(bars);

      card.appendChild(img);
      card.appendChild(right);

      container.appendChild(card);
    });
  }

  // compat (se algum módulo chamar renderSquad)
  function renderSquad() { renderTeamSquad(); }

  window.TeamUI = {
    renderTeamSelection,
    renderTeamSquad,
    renderSquad
  };
})();