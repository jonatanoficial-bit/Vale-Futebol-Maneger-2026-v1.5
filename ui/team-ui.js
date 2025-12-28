/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/team-ui.js — Seleção de Time (REAL) + compat
   -------------------------------------------------------
   - Define TeamUi.renderTeamSelection() (exigido)
   - Define TeamUI.renderTeamSelection() (compat)
   - Mantém TeamUI.renderSquad() (compat com versão antiga)
   - Seta marcador __TEAM_UI_REAL__ = true
   =======================================================*/

(function () {
  console.log("%c[TEAM-UI REAL] carregado", "color:#22c55e; font-weight:bold;");

  // marcador para o index saber que carregou
  window.__TEAM_UI_REAL__ = true;

  if (!window.TeamUi) window.TeamUi = {};
  if (!window.TeamUI) window.TeamUI = window.TeamUi;

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    return window.gameState;
  }

  function getTeams() {
    if (window.Database && Array.isArray(Database.teams)) return Database.teams;
    return [];
  }

  function showScreen(id) {
    // tenta UI.mostrarTela se existir
    try {
      if (window.UI && typeof UI.mostrarTela === "function") {
        UI.mostrarTela(id);
        return;
      }
    } catch (e) {}

    // fallback: alterna .tela/.ativa
    document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add("ativa");
  }

  function safeSave() {
    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}
    try { localStorage.setItem("vfm-save", JSON.stringify(window.gameState)); } catch (e) {}
  }

  function getLogo(team) {
    return team?.logo || team?.escudo || team?.badge || team?.imgLogo || "assets/logos/default.png";
  }

  function renderTeamSelection() {
    const teams = getTeams();
    if (!teams.length) {
      alert("Database.teams vazio. engine/database.js não carregou.");
      return;
    }

    const tela = document.getElementById("tela-escolha-time");
    const lista = document.getElementById("lista-times");
    if (!tela || !lista) {
      alert("index.html não tem #tela-escolha-time ou #lista-times.");
      return;
    }

    lista.innerHTML = "";

    teams.forEach(team => {
      const card = document.createElement("div");
      card.className = "card-time";

      // fallback AAA se CSS não tiver card-time
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

      const div = document.createElement("div");
      const serie = (team.division || team.serie || "A").toString().toUpperCase();
      div.textContent = `Série ${serie}`;
      div.style.opacity = ".75";
      div.style.fontWeight = "900";
      div.style.fontSize = "12px";

      card.appendChild(img);
      card.appendChild(nm);
      card.appendChild(div);

      card.onclick = () => {
        const gs = ensureGS();
        gs.selectedTeamId = team.id;
        gs.currentTeamId = team.id;

        try { if (window.Game) Game.teamId = team.id; } catch (e) {}
        safeSave();

        // entra no lobby
        try {
          if (window.UI && typeof UI.entrarNoLobby === "function") {
            UI.entrarNoLobby();
          } else {
            showScreen("tela-lobby");
          }
        } catch (e) {
          showScreen("tela-lobby");
        }

        // render do Hub AAA se existir
        try { if (window.LobbyHubUI && typeof LobbyHubUI.render === "function") LobbyHubUI.render(); } catch (e) {}
      };

      lista.appendChild(card);
    });

    showScreen("tela-escolha-time");
  }

  // Compat com versão antiga (renderSquad)
  function renderSquad() {
    try {
      if (window.UI && typeof UI.abrirElenco === "function") UI.abrirElenco();
    } catch (e) {}
  }

  window.TeamUi.renderTeamSelection = renderTeamSelection;
  window.TeamUI.renderTeamSelection = renderTeamSelection;
  window.TeamUI.renderSquad = renderSquad;

})();