/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/team-ui.js — Team Selection + Squad Renderer (AAA safe)
   -------------------------------------------------------
   Fornece:
   - TeamUi.renderTeamSelection()  ✅ (corrige erro)
   - TeamUI.renderTeamSelection()  ✅ compat
   - TeamUI.renderSquad()          ✅ mantém antigo

   Usa:
   - #tela-escolha-time, #lista-times
   - gameState.selectedTeamId / currentTeamId
   =======================================================*/

(function () {
  console.log("%c[TEAM-UI] team-ui.js carregado (selection+squad)", "color:#a855f7; font-weight:bold;");

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    return window.gameState;
  }

  function getTeams() {
    if (window.Database && Array.isArray(Database.teams)) return Database.teams;
    if (Array.isArray(window.teams)) return window.teams;
    return [];
  }

  function getPlayers() {
    if (window.Database && Array.isArray(Database.players)) return Database.players;
    if (Array.isArray(window.players)) return window.players;
    return [];
  }

  function showScreen(id) {
    // usa UI.mostrarTela se existir
    try {
      if (window.UI && typeof UI.mostrarTela === "function") {
        UI.mostrarTela(id);
        return;
      }
    } catch (e) {}

    // fallback: alterna classes .tela/.ativa
    document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add("ativa");
  }

  function safeSave() {
    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}
    try { if (typeof salvarJogo === "function") salvarJogo(); } catch (e) {}
    try { localStorage.setItem("vfm-save", JSON.stringify(window.gameState)); } catch (e) {}
  }

  function getLogo(team) {
    return team?.logo || team?.escudo || team?.badge || team?.imgLogo || "assets/logos/default.png";
  }

  // -----------------------------
  // TEAM SELECTION (corrige erro)
  // -----------------------------
  function renderTeamSelection() {
    const teams = getTeams();
    if (!teams.length) {
      alert("Database.teams está vazio. engine/database.js não carregou.");
      return;
    }

    const tela = document.getElementById("tela-escolha-time");
    const lista = document.getElementById("lista-times");

    if (!tela || !lista) {
      alert("Tela de escolha (#tela-escolha-time / #lista-times) não encontrada no index.html.");
      return;
    }

    // limpa e renderiza cards
    lista.innerHTML = "";

    teams.forEach(team => {
      const card = document.createElement("div");
      card.className = "card-time";

      // estilos inline de fallback (caso style.css não tenha card-time)
      card.style.border = "1px solid rgba(255,255,255,.12)";
      card.style.borderRadius = "18px";
      card.style.padding = "12px";
      card.style.background = "rgba(255,255,255,.06)";
      card.style.boxShadow = "0 10px 28px rgba(0,0,0,.30)";
      card.style.cursor = "pointer";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.alignItems = "center";
      card.style.gap = "8px";
      card.style.backdropFilter = "blur(10px)";

      const img = document.createElement("img");
      img.src = getLogo(team);
      img.alt = team.name || "Time";
      img.style.width = "72px";
      img.style.height = "72px";
      img.style.objectFit = "contain";
      img.onerror = () => { img.src = "assets/logos/default.png"; };

      const nm = document.createElement("div");
      nm.textContent = team.name || "Clube";
      nm.style.fontWeight = "1000";
      nm.style.textAlign = "center";

      const serie = document.createElement("div");
      const div = (team.division || team.serie || "A").toString().toUpperCase();
      serie.textContent = `Série ${div}`;
      serie.style.opacity = ".75";
      serie.style.fontWeight = "900";
      serie.style.fontSize = "12px";

      card.appendChild(img);
      card.appendChild(nm);
      card.appendChild(serie);

      card.onclick = () => {
        const gs = ensureGS();

        gs.selectedTeamId = team.id;
        gs.currentTeamId = team.id;

        try { if (window.Game) Game.teamId = team.id; } catch (e) {}

        safeSave();

        // entra no lobby se UI existir, senão só troca tela
        try {
          if (window.UI && typeof UI.entrarNoLobby === "function") {
            UI.entrarNoLobby();
          } else {
            showScreen("tela-lobby");
          }
        } catch (e) {
          showScreen("tela-lobby");
        }

        // força render do HUB AAA (se já estiver no projeto)
        try { if (window.LobbyHubUI && typeof LobbyHubUI.render === "function") LobbyHubUI.render(); } catch (e) {}
      };

      lista.appendChild(card);
    });

    showScreen("tela-escolha-time");
  }

  // -----------------------------
  // SQUAD RENDER (mantém antigo)
  // -----------------------------
  function obterElencoAtual() {
    const gs = ensureGS();
    const teamId = gs.selectedTeamId || gs.currentTeamId || (window.Game && Game.teamId) || null;
    if (!teamId) return [];

    // se existir helper na Database
    try {
      if (window.Database && typeof Database.carregarElencoDoTime === "function") {
        const elenco = Database.carregarElencoDoTime(teamId);
        if (Array.isArray(elenco)) return elenco;
      }
    } catch (e) {}

    const all = getPlayers();
    return all.filter(p => String(p.teamId) === String(teamId));
  }

  function getFacePath(p) {
    if (p && p.face) return p.face;
    if (p && p.id) return `assets/face/${p.id}.png`;
    return "";
  }

  function renderSquad() {
    const container = document.getElementById("elenco-lista");
    if (!container) {
      console.warn("[TEAM-UI] #elenco-lista não encontrado.");
      return;
    }

    const elenco = obterElencoAtual();
    container.innerHTML = "";

    if (!elenco.length) {
      container.innerHTML = "<p style='padding:10px;'>Nenhum jogador encontrado para este time.</p>";
      return;
    }

    elenco.forEach(p => {
      const nome = p.name || p.nome || "Jogador";
      const pos = p.position || p.posicao || p.pos || p.role || "POS";
      const ovr = p.overall ?? p.ovr ?? p.rating ?? 70;
      const imgSrc = getFacePath(p);

      const card = document.createElement("div");
      card.className = "card-jogador";
      card.innerHTML = `
        <img src="${imgSrc}" alt="${nome}" onerror="this.style.display='none'">
        <h3>${nome}</h3>
        <p>${pos}</p>
        <p class="ovr">${ovr}</p>
      `;
      container.appendChild(card);
    });
  }

  // -----------------------------
  // Export (TeamUi + TeamUI)
  // -----------------------------
  if (!window.TeamUi) window.TeamUi = {};
  if (!window.TeamUI) window.TeamUI = window.TeamUi;

  window.TeamUi.renderTeamSelection = renderTeamSelection;
  window.TeamUI.renderTeamSelection = renderTeamSelection;

  // mantém compat do antigo:
  window.TeamUI.renderSquad = renderSquad;

})();