// ui/calendar-ui.js
// =======================================================
// UI do Calendário da Temporada
// =======================================================

(function () {
  console.log("%c[UI] calendar-ui.js carregado", "color:#38bdf8; font-weight:bold;");

  function mostrarTela(id) {
    document.querySelectorAll(".tela").forEach((t) => t.classList.remove("ativa"));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add("ativa");
  }

  function getCurrentTeamAndDivision() {
    const gs = window.gameState || {};
    const teamId = gs.currentTeamId || (window.Game && Game.teamId);
    if (!teamId) return { team: null, division: "A" };
    const lista = (window.Database && Database.teams) || window.teams || [];
    const team = lista.find((t) => t.id === teamId) || null;
    const division = team?.division || "A";
    return { team, division };
  }

  function renderCalendario() {
    const container = document.getElementById("lista-calendario");
    if (!container) {
      console.warn("[UI] #lista-calendario não encontrado.");
      return;
    }

    const { team, division } = getCurrentTeamAndDivision();
    if (!team) {
      container.innerHTML = "<p>Selecione um time para ver o calendário.</p>";
      return;
    }

    if (!window.League || typeof League.getCalendarForDivision !== "function") {
      container.innerHTML = "<p>Sistema de liga não carregado.</p>";
      return;
    }

    const calendario = League.getCalendarForDivision(division);
    const rodadaAtual = League.getCurrentRound(division);

    container.innerHTML = "";

    calendario.forEach((rodadaInfo) => {
      const bloco = document.createElement("div");
      bloco.className = "linha-rodada";
      if (rodadaInfo.round === rodadaAtual) bloco.classList.add("rodada-atual");

      const titulo = document.createElement("h3");
      titulo.textContent = `Rodada ${rodadaInfo.round} – ${rodadaInfo.date}`;
      bloco.appendChild(titulo);

      const lista = document.createElement("ul");

      rodadaInfo.matches.forEach((m) => {
        const li = document.createElement("li");
        const home = Database.getTeamById(m.homeId);
        const away = Database.getTeamById(m.awayId);
        const nomeH = home?.shortName || home?.name || m.homeId;
        const nomeA = away?.shortName || away?.name || m.awayId;

        let placar = "vs";
        if (m.played && m.goalsHome != null && m.goalsAway != null) {
          placar = `${m.goalsHome} x ${m.goalsAway}`;
        }

        li.textContent = `${nomeH} ${placar} ${nomeA}`;
        if (m.homeId === team.id || m.awayId === team.id) {
          li.classList.add("jogo-do-usuario");
        }

        lista.appendChild(li);
      });

      bloco.appendChild(lista);
      container.appendChild(bloco);
    });
  }

  const CalendarUI = {
    abrirCalendario() {
      console.log("[UI] abrirCalendario() disparado.");
      renderCalendario();
      mostrarTela("tela-calendario");
    },
  };

  window.UI = Object.assign(window.UI || {}, CalendarUI);
})();

