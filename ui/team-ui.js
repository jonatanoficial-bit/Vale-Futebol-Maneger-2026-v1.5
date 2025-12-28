/* =======================================================
   TEAM UI – Vale Futebol Manager 2026 (FIX DEFINITIVO)
   - Implementa TeamUI.renderTeamSelection() (obrigatório)
   - Mantém TeamUI.renderSquad() sem recursão
   - Garante que ao escolher um time:
       * Game.teamId é setado
       * gameState (se existir) recebe o time
       * salva automaticamente (se Save existir)
       * abre o Lobby
   ======================================================= */

(function () {
  console.log("%c[TEAM-UI] team-ui.js carregado (FIX)", "color:#a855f7");

  // ---------- helpers ----------
  function getTeamsSafe() {
    if (window.Database && Array.isArray(Database.teams) && Database.teams.length) {
      return Database.teams;
    }
    return [];
  }

  function getPlayersSafe() {
    if (window.Database && Array.isArray(Database.players) && Database.players.length) {
      return Database.players;
    }
    return [];
  }

  function getTeamLogoPath(teamId) {
    if (!teamId) return "";
    return `assets/logos/${teamId}.png`;
  }

  function getFacePath(p) {
    if (p && p.face) return p.face;
    if (p && p.id) return `assets/face/${p.id}.png`;
    return "";
  }

  function getCurrentTeamId() {
    // Prioridade: Game.teamId (o jogo usa isso em várias telas)
    if (window.Game && Game.teamId) return Game.teamId;

    // fallback: gameState (algumas partes usam)
    if (window.gameState) {
      return (
        gameState.selectedTeamId ||
        gameState.currentTeamId ||
        gameState.controlledTeamId ||
        null
      );
    }
    return null;
  }

  function persistCareerIfPossible() {
    try {
      if (window.Save && typeof Save.salvarJogo === "function") {
        Save.salvarJogo();
      }
    } catch (e) {
      console.warn("[TEAM-UI] Falha ao salvar (não fatal):", e);
    }
  }

  function setTeamAsControlled(teamId) {
    // 1) garante Game.teamId
    if (!window.Game) window.Game = {};
    Game.teamId = teamId;

    // 2) garante gameState coerente (se existir)
    if (!window.gameState) window.gameState = {};
    gameState.selectedTeamId = teamId;
    gameState.currentTeamId = teamId;
    gameState.controlledTeamId = teamId;

    // 3) se existir helper do seu game.js, usa também
    try {
      if (typeof window.resetGameStateForNewCareer === "function") {
        window.resetGameStateForNewCareer(teamId);
        // re-garante após reset (caso reset use outros nomes)
        gameState.selectedTeamId = teamId;
        gameState.currentTeamId = teamId;
        gameState.controlledTeamId = teamId;
        if (window.Game) Game.teamId = teamId;
      }
    } catch (e) {
      console.warn("[TEAM-UI] resetGameStateForNewCareer falhou (não fatal):", e);
    }

    // 4) salva
    persistCareerIfPossible();
  }

  function openLobbySafe() {
    try {
      if (window.UI && typeof UI.abrirLobby === "function") {
        UI.abrirLobby();
        return;
      }
    } catch (e) {
      console.warn("[TEAM-UI] UI.abrirLobby falhou (não fatal):", e);
    }

    // fallback extremo: mostra tela-lobby manualmente
    try {
      const lobby = document.getElementById("tela-lobby");
      if (lobby) {
        document.querySelectorAll(".tela").forEach((t) => (t.style.display = "none"));
        lobby.style.display = "block";
      }
    } catch (_) {}
  }

  // ---------- render team selection (AAA) ----------
  function renderTeamSelection() {
    const container = document.getElementById("lista-times");
    if (!container) {
      console.warn("[TEAM-UI] #lista-times não encontrado.");
      return;
    }

    const teams = getTeamsSafe();
    container.innerHTML = "";

    if (!teams.length) {
      container.innerHTML =
        "<p style='padding:12px;'>Nenhum time encontrado no Database.teams.</p>";
      return;
    }

    // grid responsivo sem depender de CSS externo
    container.style.display = "grid";
    container.style.gridTemplateColumns = "repeat(auto-fit, minmax(140px, 1fr))";
    container.style.gap = "14px";

    teams.forEach((team) => {
      const id = team.id || team.teamId || "";
      const nome = team.name || team.nome || id || "Time";
      const serie = team.league || team.division || team.serie || "";

      const card = document.createElement("button");
      card.type = "button";
      card.className = "team-card";
      card.style.border = "1px solid rgba(255,255,255,0.15)";
      card.style.borderRadius = "16px";
      card.style.background = "rgba(0,0,0,0.55)";
      card.style.backdropFilter = "blur(6px)";
      card.style.padding = "14px";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.alignItems = "center";
      card.style.justifyContent = "space-between";
      card.style.minHeight = "170px";
      card.style.cursor = "pointer";

      const logo = document.createElement("img");
      logo.src = getTeamLogoPath(id);
      logo.alt = nome;
      logo.style.width = "64px";
      logo.style.height = "64px";
      logo.style.objectFit = "contain";
      logo.style.marginBottom = "10px";
      logo.onerror = function () {
        // se faltar logo, esconde a imagem e não quebra o layout
        this.style.display = "none";
      };

      const title = document.createElement("div");
      title.textContent = nome;
      title.style.color = "#fff";
      title.style.fontWeight = "800";
      title.style.fontSize = "16px";
      title.style.textAlign = "center";
      title.style.lineHeight = "1.2";
      title.style.marginTop = "6px";

      const sub = document.createElement("div");
      sub.textContent = serie ? String(serie) : "";
      sub.style.color = "rgba(255,255,255,0.7)";
      sub.style.fontSize = "12px";
      sub.style.marginTop = "4px";

      card.appendChild(logo);
      card.appendChild(title);
      card.appendChild(sub);

      card.addEventListener("click", () => {
        if (!id) return;

        // se existir função global do main.js, usa ela (mantém seu fluxo atual)
        try {
          if (typeof window.selecionarTimeBasico === "function") {
            window.selecionarTimeBasico(id);
          } else {
            // fallback: faz tudo aqui
            setTeamAsControlled(id);
          }
        } catch (e) {
          console.warn("[TEAM-UI] selecionarTimeBasico falhou, usando fallback:", e);
          setTeamAsControlled(id);
        }

        // abre lobby
        openLobbySafe();
      });

      container.appendChild(card);
    });
  }

  // ---------- render squad ----------
  function renderSquad() {
    const container = document.getElementById("elenco-lista");
    if (!container) {
      console.warn("[TEAM-UI] #elenco-lista não encontrado.");
      return;
    }

    const teamId = getCurrentTeamId();
    container.innerHTML = "";

    if (!teamId) {
      container.innerHTML =
        "<p style='padding:10px;'>Nenhum time selecionado. Volte e escolha um time.</p>";
      return;
    }

    // Se existir função oficial do Database, usa
    let elenco = [];
    try {
      if (window.Database && typeof Database.carregarElencoDoTime === "function") {
        const x = Database.carregarElencoDoTime(teamId);
        if (Array.isArray(x)) elenco = x;
      }
    } catch (_) {}

    // fallback: filtra Database.players
    if (!elenco.length) {
      elenco = getPlayersSafe().filter((p) => p.teamId === teamId);
    }

    if (!elenco.length) {
      container.innerHTML =
        "<p style='padding:10px;'>Nenhum jogador encontrado para este time.</p>";
      return;
    }

    // estilo grid sem depender do CSS externo
    container.style.display = "grid";
    container.style.gridTemplateColumns = "repeat(auto-fit, minmax(160px, 1fr))";
    container.style.gap = "14px";

    elenco.forEach((p) => {
      const nome = p.name || p.nome || "Jogador";
      const pos = p.position || p.posicao || p.pos || p.role || "POS";
      const ovr = p.overall ?? p.ovr ?? p.rating ?? 70;
      const imgSrc = getFacePath(p);

      const card = document.createElement("div");
      card.className = "card-jogador";
      card.style.border = "1px solid rgba(255,255,255,0.12)";
      card.style.borderRadius = "16px";
      card.style.background = "rgba(0,0,0,0.55)";
      card.style.backdropFilter = "blur(6px)";
      card.style.padding = "14px";
      card.style.textAlign = "center";
      card.style.color = "#fff";

      const img = document.createElement("img");
      img.src = imgSrc;
      img.alt = nome;
      img.style.width = "96px";
      img.style.height = "96px";
      img.style.borderRadius = "14px";
      img.style.objectFit = "cover";
      img.style.marginBottom = "10px";
      img.onerror = function () {
        this.style.display = "none";
      };

      const h3 = document.createElement("div");
      h3.textContent = nome;
      h3.style.fontWeight = "800";
      h3.style.fontSize = "16px";
      h3.style.marginTop = "4px";

      const pPos = document.createElement("div");
      pPos.textContent = pos;
      pPos.style.opacity = "0.8";
      pPos.style.marginTop = "4px";

      const pOvr = document.createElement("div");
      pOvr.textContent = String(ovr);
      pOvr.style.fontWeight = "900";
      pOvr.style.fontSize = "18px";
      pOvr.style.marginTop = "6px";
      pOvr.style.color = "#d4af37"; // dourado “AAA”

      card.appendChild(img);
      card.appendChild(h3);
      card.appendChild(pPos);
      card.appendChild(pOvr);
      container.appendChild(card);
    });
  }

  // expõe global
  window.TeamUI = {
    renderTeamSelection,
    renderSquad,
  };
})();