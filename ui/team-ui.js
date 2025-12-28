/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/team-ui.js — Seleção de Clube (OBRIGATÓRIO)
   -------------------------------------------------------
   Corrige erro:
   TeamUI.renderTeamSelection não encontrado

   Responsável por:
   - Tela de escolha de clube
   - Definir gameState.currentTeamId
   - Transição para o lobby
   =======================================================*/

(function () {
  console.log("%c[TeamUI] team-ui.js carregado", "color:#22c55e; font-weight:bold;");

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    return window.gameState;
  }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }

  function clearScreen() {
    document.body.innerHTML = "";
  }

  function renderTeamSelection() {
    const gs = ensureGS();
    const teams = getTeams();

    if (!teams.length) {
      alert("Nenhum time encontrado em Database.teams");
      return;
    }

    clearScreen();

    const wrap = document.createElement("div");
    wrap.style.minHeight = "100vh";
    wrap.style.background = "radial-gradient(circle at top, #0f172a, #020617)";
    wrap.style.color = "#fff";
    wrap.style.padding = "16px";
    wrap.style.fontFamily = "system-ui, sans-serif";

    const title = document.createElement("h2");
    title.textContent = "Escolha seu Clube";
    title.style.textAlign = "center";
    title.style.marginBottom = "12px";
    title.style.letterSpacing = "1px";

    const list = document.createElement("div");
    list.style.display = "grid";
    list.style.gridTemplateColumns = "repeat(auto-fill, minmax(140px, 1fr))";
    list.style.gap = "12px";

    teams.forEach(team => {
      const card = document.createElement("div");
      card.style.border = "1px solid rgba(255,255,255,.15)";
      card.style.borderRadius = "16px";
      card.style.padding = "10px";
      card.style.background = "rgba(255,255,255,.05)";
      card.style.cursor = "pointer";
      card.style.textAlign = "center";

      const logo = document.createElement("img");
      logo.src = team.logo || team.escudo || "";
      logo.style.width = "64px";
      logo.style.height = "64px";
      logo.style.objectFit = "contain";
      logo.style.marginBottom = "6px";

      const name = document.createElement("div");
      name.textContent = team.name;
      name.style.fontWeight = "900";
      name.style.fontSize = "14px";

      card.appendChild(logo);
      card.appendChild(name);

      card.onclick = () => {
        gs.currentTeamId = team.id;
        gs.selectedTeamId = team.id;

        try {
          if (window.Save && typeof Save.salvar === "function") Save.salvar();
        } catch (e) {}

        // volta para lobby
        if (typeof location !== "undefined") {
          location.reload();
        }
      };

      list.appendChild(card);
    });

    wrap.appendChild(title);
    wrap.appendChild(list);
    document.body.appendChild(wrap);
  }

  // API pública exigida pelo jogo
  window.TeamUI = {
    renderTeamSelection
  };
})();