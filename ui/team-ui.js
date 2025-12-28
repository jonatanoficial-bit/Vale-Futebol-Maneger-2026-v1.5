/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/team-ui.js — Seleção de Clube (OBRIGATÓRIO)
   -------------------------------------------------------
   Corrige erro:
   TeamUi.renderTeamSelection não encontrado

   Responsável por:
   - Tela de escolha de clube (logos já existentes)
   - Define gameState.currentTeamId / selectedTeamId
   - Recarrega para entrar no lobby

   Exporta:
   - window.TeamUi.renderTeamSelection()
   - window.TeamUI.renderTeamSelection() (compatibilidade)
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

  function getLogo(team) {
    return team?.logo || team?.escudo || team?.badge || team?.imgLogo || "";
  }

  function safeSave() {
    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}
    try { if (typeof salvarJogo === "function") salvarJogo(); } catch (e) {}
    try { localStorage.setItem("vfm-save", JSON.stringify(window.gameState)); } catch (e) {}
  }

  function clearScreen() {
    document.body.innerHTML = "";
    document.body.style.margin = "0";
    document.body.style.background = "#000";
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
    wrap.style.padding = "16px";
    wrap.style.boxSizing = "border-box";
    wrap.style.background =
      "radial-gradient(1200px 600px at 20% 10%, rgba(167,139,250,.18), transparent 52%)," +
      "radial-gradient(1200px 600px at 85% 0%, rgba(34,197,94,.14), transparent 60%)," +
      "rgba(0,0,0,.92)";
    wrap.style.color = "#fff";
    wrap.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";

    const title = document.createElement("div");
    title.style.display = "flex";
    title.style.flexDirection = "column";
    title.style.gap = "4px";
    title.style.marginBottom = "14px";
    title.style.textAlign = "center";

    const h = document.createElement("div");
    h.textContent = "Escolha seu Clube";
    h.style.fontWeight = "1000";
    h.style.letterSpacing = ".8px";
    h.style.textTransform = "uppercase";
    h.style.fontSize = "14px";

    const sub = document.createElement("div");
    sub.textContent = "Logos e identidade visual do seu banco — estilo AAA";
    sub.style.opacity = ".75";
    sub.style.fontWeight = "900";
    sub.style.fontSize = "12px";

    title.appendChild(h);
    title.appendChild(sub);

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(140px, 1fr))";
    grid.style.gap = "12px";

    teams.forEach(team => {
      const card = document.createElement("div");
      card.style.border = "1px solid rgba(255,255,255,.12)";
      card.style.borderRadius = "18px";
      card.style.padding = "12px";
      card.style.background = "rgba(255,255,255,.05)";
      card.style.boxShadow = "0 10px 28px rgba(0,0,0,.30)";
      card.style.cursor = "pointer";
      card.style.textAlign = "center";
      card.style.backdropFilter = "blur(10px)";

      const logoWrap = document.createElement("div");
      logoWrap.style.width = "72px";
      logoWrap.style.height = "72px";
      logoWrap.style.margin = "0 auto 8px";
      logoWrap.style.borderRadius = "18px";
      logoWrap.style.overflow = "hidden";
      logoWrap.style.border = "1px solid rgba(255,255,255,.10)";
      logoWrap.style.background = "rgba(0,0,0,.25)";
      logoWrap.style.display = "flex";
      logoWrap.style.alignItems = "center";
      logoWrap.style.justifyContent = "center";

      const logo = document.createElement("img");
      logo.src = getLogo(team);
      logo.alt = team?.name || "Clube";
      logo.style.width = "100%";
      logo.style.height = "100%";
      logo.style.objectFit = "contain";

      // se não tiver logo, usa ícone
      logo.onerror = () => {
        logo.remove();
        logoWrap.textContent = "⚽";
        logoWrap.style.fontSize = "28px";
      };

      logoWrap.appendChild(logo);

      const name = document.createElement("div");
      name.textContent = team?.name || "Clube";
      name.style.fontWeight = "1000";
      name.style.fontSize = "14px";
      name.style.letterSpacing = ".2px";
      name.style.whiteSpace = "nowrap";
      name.style.overflow = "hidden";
      name.style.textOverflow = "ellipsis";

      const meta = document.createElement("div");
      const serie = (team?.division || team?.serie || "A").toString().toUpperCase();
      meta.textContent = `Série ${serie}`;
      meta.style.opacity = ".75";
      meta.style.fontWeight = "900";
      meta.style.fontSize = "12px";
      meta.style.marginTop = "2px";

      card.appendChild(logoWrap);
      card.appendChild(name);
      card.appendChild(meta);

      card.onclick = () => {
        gs.currentTeamId = team.id;
        gs.selectedTeamId = team.id;

        // também seta Game.teamId se existir
        try { if (window.Game) Game.teamId = team.id; } catch (e) {}

        safeSave();

        // Recarrega para voltar ao fluxo normal do jogo
        location.reload();
      };

      grid.appendChild(card);
    });

    wrap.appendChild(title);
    wrap.appendChild(grid);
    document.body.appendChild(wrap);
  }

  // Exporta nos 2 nomes (COMPATIBILIDADE TOTAL)
  if (!window.TeamUi) window.TeamUi = {};
  if (!window.TeamUI) window.TeamUI = window.TeamUi;

  window.TeamUi.renderTeamSelection = renderTeamSelection;
  window.TeamUI.renderTeamSelection = renderTeamSelection;
})();