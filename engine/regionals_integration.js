/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/regionals_integration.js – Integração dos Estaduais

   Faz wrappers em:
   - League.startNewCareer (inicia estaduais)
   - League.prepararProximoJogo (se fase estaduais, prepara jogo estadual)
   - Match.finalizarPartida (se jogo estadual, processa no Regionals)

   Sem quebrar Copa do Brasil (cup_integration continua funcionando).
   =======================================================*/

(function () {
  console.log("%c[REGIONAIS-INTEGRATION] carregado", "color:#0ea5e9; font-weight:bold;");

  function waitForModules() {
    if (!window.League || !window.Match || !window.Regionals) {
      setTimeout(waitForModules, 60);
      return;
    }

    // -----------------------------
    // WRAP: startNewCareer
    // -----------------------------
    const originalStartNewCareer = League.startNewCareer;
    if (typeof originalStartNewCareer === "function") {
      League.startNewCareer = function (teamId) {
        const res = originalStartNewCareer.call(League, teamId);
        try {
          if (window.gameState) {
            // garante fase de estaduais no começo
            gameState.phase = "ESTADUAIS";
            const season = gameState.seasonYear || new Date().getFullYear();
            Regionals.initRegionalsForSeason(season);
          }
        } catch (e) {
          console.warn("[REGIONAIS-INTEGRATION] Erro ao iniciar estaduais:", e);
        }
        return res;
      };
      console.log("[REGIONAIS-INTEGRATION] Wrapper aplicado em League.startNewCareer");
    }

    // -----------------------------
    // WRAP: prepararProximoJogo
    // -----------------------------
    const originalPrepararProximoJogo = League.prepararProximoJogo;
    if (typeof originalPrepararProximoJogo === "function") {
      League.prepararProximoJogo = function () {
        try {
          const teamId =
            (window.gameState && gameState.currentTeamId) ||
            (window.Game && Game.teamId);

          // se ainda não tem time, cai pro original
          if (!teamId) return originalPrepararProximoJogo.call(League);

          // se fase estaduais, tenta pegar jogo do estadual do usuário
          if (window.gameState && gameState.phase === "ESTADUAIS") {
            const next = Regionals.getMatchForUserInCurrentWeek(teamId);
            if (next && next.match) {
              // define contexto para finalizar partida corretamente
              window.currentMatchContext = {
                competition: "REGIONAL",
                competitionId: next.competitionId,
                competitionName: next.competitionName,
                week: next.week
              };

              const match = next.match;

              // prepara Match.state igual a liga faz
              const teams = (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
              const homeTeam = teams.find(t => t.id === match.homeId);
              const awayTeam = teams.find(t => t.id === match.awayId);

              Match.state = {
                homeId: match.homeId,
                awayId: match.awayId,
                minute: 0,
                goalsHome: 0,
                goalsAway: 0,
                finished: false,
                halftimeDone: false
              };

              if (typeof Match._setupTelaPartida === "function") {
                Match._setupTelaPartida(homeTeam, awayTeam);
              }

              const log = document.getElementById("log-partida");
              if (log) log.innerHTML = "";
              const cron = document.getElementById("cronometro");
              if (cron) cron.textContent = "0'";

              // inicia loop do match
              if (typeof Match.comecarLoop === "function") {
                Match.comecarLoop();
              }

              console.log("[REGIONAIS-INTEGRATION] Preparando jogo estadual:", next.competitionName, "Semana", next.week);
              return;
            }

            // se não tem jogo nesta semana (ex: BYE), avança semana simulando e tenta de novo
            if (window.gameState && gameState.regionals && typeof gameState.regionals.week === "number") {
              console.log("[REGIONAIS-INTEGRATION] Sem jogo do usuário nesta semana estadual. Avançando semana.");
              gameState.regionals.week += 1;

              // se ultrapassou, encerra fase
              if (gameState.regionals.week > (gameState.regionals.totalWeeks || 1)) {
                gameState.phase = "NACIONAL";
              }
            }
          }
        } catch (e) {
          console.warn("[REGIONAIS-INTEGRATION] Erro em prepararProximoJogo (regionais):", e);
        }

        // fallback original (liga)
        return originalPrepararProximoJogo.call(League);
      };

      console.log("[REGIONAIS-INTEGRATION] Wrapper aplicado em League.prepararProximoJogo");
    }

    // -----------------------------
    // WRAP: Match.finalizarPartida
    // -----------------------------
    const originalFinalizar = Match.finalizarPartida;
    if (typeof originalFinalizar === "function") {
      Match.finalizarPartida = function () {
        try {
          // se é jogo estadual, processa via Regionals
          if (window.currentMatchContext && currentMatchContext.competition === "REGIONAL") {
            const homeId = Match.state?.homeId;
            const awayId = Match.state?.awayId;
            const golsHome = Match.state?.goalsHome ?? 0;
            const golsAway = Match.state?.goalsAway ?? 0;

            const rodadaRegional = Regionals.processUserRegionalResult(
              homeId,
              awayId,
              golsHome,
              golsAway
            );

            // mostra algo na UI (reaproveita modal básico do jogo)
            if (window.UI && typeof UI.mostrarResultadosRodada === "function" && rodadaRegional) {
              // UI atual espera lista de jogos com homeId/awayId/golsHome/golsAway
              UI.mostrarResultadosRodada(rodadaRegional);
            } else if (window.UI && typeof UI.voltarLobby === "function") {
              alert(`Fim de jogo!\n${golsHome} x ${golsAway}\n(${currentMatchContext.competitionName})`);
              UI.voltarLobby();
            }

            // limpa contexto
            window.currentMatchContext = null;

            // salva, se disponível
            try {
              if (window.Save && typeof Save.salvar === "function") Save.salvar();
            } catch (e2) {}

            return;
          }
        } catch (e) {
          console.warn("[REGIONAIS-INTEGRATION] Erro ao finalizar jogo estadual:", e);
        }

        // se não é estadual, usa fluxo normal
        return originalFinalizar.call(Match);
      };

      console.log("[REGIONAIS-INTEGRATION] Wrapper aplicado em Match.finalizarPartida");
    }
  }

  waitForModules();
})();