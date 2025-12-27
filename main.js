/* =======================================================
   VALE FUTEBOL MANAGER 2026
   main.js — Inicialização do jogo e navegação de telas
   + Lobby AAA Dashboard (fase, próximo jogo, mini-tabela,
     estaduais e notícias)
   =======================================================*/

console.log(
  "%c[MAIN] Vale Futebol Manager 2026 carregado",
  "color:#C7A029; font-size:16px; font-weight:bold"
);

/* =======================================================
   FUNÇÃO GLOBAL DE TROCA DE TELAS
   =======================================================*/
function mostrarTela(id) {
  document.querySelectorAll(".tela").forEach((t) => t.classList.remove("ativa"));
  const alvo = document.getElementById(id);
  if (alvo) alvo.classList.add("ativa");
  else console.warn("[MAIN] Tela não encontrada:", id);
}

/* =======================================================
   HELPERS
   =======================================================*/
function getAllTeams() {
  try {
    if (window.Database && Array.isArray(Database.teams)) return Database.teams;
  } catch (e) {}
  return [];
}

function getTeamById(teamId) {
  const teams = getAllTeams();
  return teams.find((t) => t.id === teamId) || null;
}

function getDivisionForTeam(team) {
  if (!team) return "A";
  return team.division || team.serie || "A";
}

function fmtMoneyMi(val) {
  const n = Number(val);
  if (isNaN(n)) return "0 mi";
  return `${n.toFixed(1)} mi`;
}

function safeText(el, txt) {
  if (el) el.textContent = txt;
}

function clearEl(el) {
  if (!el) return;
  while (el.firstChild) el.removeChild(el.firstChild);
}

function el(tag, className, text) {
  const d = document.createElement(tag);
  if (className) d.className = className;
  if (text != null) d.textContent = text;
  return d;
}

/* =======================================================
   CONFIGURAÇÃO DOS BOTÕES DA CAPA
   =======================================================*/
function configurarBotoes() {
  const btnIniciar = document.getElementById("btn-iniciar");
  const btnContinuar = document.getElementById("btn-continuar");
  const btnCarregarJSON = document.getElementById("btn-carregar-json");
  const inputSaveJSON = document.getElementById("input-save-json");

  // botão continuar começa oculto
  if (btnContinuar) btnContinuar.style.display = "none";

  // se houver save, mostra botão CONTINUAR
  if (window.Save && typeof Save.carregar === "function") {
    const save = Save.carregar(true); // modo "somente verificar"
    if (save) {
      console.log("[MAIN] Save encontrado, exibindo CONTINUAR CARREIRA");
      if (btnContinuar) btnContinuar.style.display = "block";
    }
  }

  // Iniciar carreira
  if (btnIniciar) {
    btnIniciar.onclick = () => {
      mostrarTela("tela-escolha-time");
      if (window.TeamUI && typeof TeamUI.renderTeamSelection === "function") {
        TeamUI.renderTeamSelection();
      }
    };
  }

  // Continuar carreira
  if (btnContinuar) {
    btnContinuar.onclick = () => {
      console.log("[MAIN] Continuar carreira");
      if (window.Save && typeof Save.carregar === "function") {
        const ok = Save.carregar();
        if (!ok) {
          alert("Não foi possível carregar o save.");
          return;
        }
      }
      carregarLobbyAAA();
      mostrarTela("tela-lobby");
    };
  }

  // Botão para carregar carreira via arquivo JSON
  if (btnCarregarJSON && inputSaveJSON) {
    btnCarregarJSON.onclick = () => {
      inputSaveJSON.value = "";
      inputSaveJSON.click();
    };

    inputSaveJSON.onchange = (ev) => {
      const file = ev.target.files && ev.target.files[0];
      if (!file) return;

      if (window.Save && typeof Save.importarDeArquivo === "function") {
        Save.importarDeArquivo(
          file,
          () => {
            alert("Carreira carregada com sucesso!");
            carregarLobbyAAA();
            mostrarTela("tela-lobby");
          },
          (err) => {
            console.error("[MAIN] Erro ao importar save JSON:", err);
            alert(
              "Não foi possível carregar o arquivo de carreira. " +
                "Verifique se ele foi gerado pelo próprio jogo."
            );
          }
        );
      } else {
        alert("Importação JSON não disponível.");
      }
    };
  }
}

/* =======================================================
   LOBBY AAA – DADOS (próximo jogo / mini tabela / regionais / news)
   =======================================================*/
function getPhaseLabel() {
  const gs = window.gameState || {};
  if (gs.phase === "ESTADUAIS") return "ESTADUAIS";
  if (gs.phase === "NACIONAL") return "NACIONAL";
  // fallback (caso antigo)
  return gs.phase ? String(gs.phase).toUpperCase() : "NACIONAL";
}

function getNextMatchInfo(teamId, division) {
  const gs = window.gameState || {};
  // 1) Estaduais
  if (gs.phase === "ESTADUAIS" && window.Regionals && typeof Regionals.getMatchForUserInCurrentWeek === "function") {
    const next = Regionals.getMatchForUserInCurrentWeek(teamId);
    if (next && next.match) {
      const oppId = next.match.homeId === teamId ? next.match.awayId : next.match.homeId;
      const opp = getTeamById(oppId);
      return {
        title: `${getTeamById(teamId)?.name || teamId} vs ${opp?.name || oppId}`,
        sub: `${next.competitionName} • Semana ${next.week}`,
        date: "—"
      };
    }
  }

  // 2) Liga nacional (Série A/B)
  if (window.League && typeof League.getCalendarForDivision === "function" && typeof League.getCurrentRound === "function") {
    const round = League.getCurrentRound(division);
    const cal = League.getCalendarForDivision(division);
    const obj = Array.isArray(cal) ? cal.find(r => r.round === round) : null;
    const matches = obj && Array.isArray(obj.matches) ? obj.matches : [];
    const m = matches.find(mm => mm.homeId === teamId || mm.awayId === teamId) || null;
    if (m) {
      const home = getTeamById(m.homeId);
      const away = getTeamById(m.awayId);
      return {
        title: `${home?.name || m.homeId} vs ${away?.name || m.awayId}`,
        sub: `Série ${division} • Rodada ${round}`,
        date: obj?.date ? String(obj.date) : "—"
      };
    }
  }

  // 3) fallback
  return { title: "—", sub: "—", date: "—" };
}

function renderMiniTable(teamId, division) {
  const box = document.getElementById("lobby-mini-table");
  if (!box) return;
  clearEl(box);

  const gs = window.gameState || {};
  const isRegionals = gs.phase === "ESTADUAIS" && window.Regionals;

  let rows = [];
  let title = "";

  if (isRegionals && typeof Regionals.getMatchForUserInCurrentWeek === "function" && typeof Regionals.getCompetitionStandings === "function") {
    const next = Regionals.getMatchForUserInCurrentWeek(teamId);
    if (next && next.competitionId) {
      rows = Regionals.getCompetitionStandings(next.competitionId) || [];
      title = next.competitionName;
    }
  } else if (window.League && typeof League.getStandingsForCurrentDivision === "function") {
    rows = League.getStandingsForCurrentDivision(division) || [];
    title = `Série ${division}`;
  }

  if (!rows.length) {
    box.appendChild(el("div", "mini-muted", "Sem dados de tabela ainda."));
    return;
  }

  // header
  const hdr = el("div", "mini-title", title || "Tabela");
  box.appendChild(hdr);

  // show top 5 + highlight user if outside top 5
  const top = rows.slice(0, 5);
  const userRow = rows.find(r => r.teamId === teamId) || null;
  const needUserExtra = userRow && !top.some(r => r.teamId === teamId);

  function rowLine(r, idx) {
    const t = getTeamById(r.teamId);
    const line = el("div", "mini-row");
    if (r.teamId === teamId) line.classList.add("mini-row-user");

    line.appendChild(el("div", "mini-pos", String(idx)));
    line.appendChild(el("div", "mini-team", t?.name || r.teamId));
    line.appendChild(el("div", "mini-pts", String(r.P ?? 0)));
    return line;
  }

  top.forEach((r, i) => box.appendChild(rowLine(r, i + 1)));

  if (needUserExtra) {
    box.appendChild(el("div", "mini-sep", "…"));
    const idx = rows.findIndex(r => r.teamId === teamId);
    box.appendChild(rowLine(userRow, idx >= 0 ? idx + 1 : 0));
  }

  const legend = el("div", "mini-legend", "Pts");
  box.appendChild(legend);
}

function renderRegionalsSummary() {
  const box = document.getElementById("lobby-regionais");
  if (!box) return;
  clearEl(box);

  if (!window.Regionals || typeof Regionals.getAllRegionalsSummary !== "function") {
    box.appendChild(el("div", "mini-muted", "Estaduais indisponíveis."));
    return;
  }

  const list = Regionals.getAllRegionalsSummary() || [];
  if (!list.length) {
    box.appendChild(el("div", "mini-muted", "Nenhum estadual ativo."));
    return;
  }

  // mostra 5 principais primeiro (SP, RJ, MG, RS, BA), depois o resto
  const order = ["SP", "RJ", "MG", "RS", "BA"];
  list.sort((a, b) => {
    const ia = order.indexOf(a.id);
    const ib = order.indexOf(b.id);
    const pa = ia === -1 ? 99 : ia;
    const pb = ib === -1 ? 99 : ib;
    return pa - pb;
  });

  list.forEach((c) => {
    const line = el("div", "regional-line");
    const left = el("div", "regional-left", c.name);
    const right = el("div", "regional-right", c.finished ? "ENCERRADO" : "EM ANDAMENTO");
    if (c.finished) right.classList.add("regional-done");
    line.appendChild(left);
    line.appendChild(right);
    box.appendChild(line);

    if (c.finished && c.championId) {
      const champ = getTeamById(c.championId);
      const champLine = el("div", "regional-champ", `🏆 Campeão: ${champ?.name || c.championId}`);
      box.appendChild(champLine);
    }
  });
}

function renderNews(teamId, division) {
  const box = document.getElementById("lobby-news");
  if (!box) return;
  clearEl(box);

  const gs = window.gameState || {};
  const team = getTeamById(teamId);

  const items = [];

  // item 1: fase
  const phase = getPhaseLabel();
  if (phase === "ESTADUAIS") {
    items.push(`Estaduais começaram! Foque em desempenho rápido e moral alta.`);
  } else {
    items.push(`Fase nacional ativa: Série ${division} + Copa do Brasil no calendário.`);
  }

  // item 2: próxima partida
  const next = getNextMatchInfo(teamId, division);
  if (next && next.title && next.title !== "—") {
    items.push(`Próximo jogo: ${next.title} • ${next.sub}`);
  }

  // item 3: dica tática
  items.push(`Dica: ajuste táticas no intervalo para influenciar o segundo tempo.`);

  // item 4: finanças
  const bal = (gs.balance != null ? gs.balance : (window.Game ? Game.saldo : 0));
  if (Number(bal) < 5) items.push(`Atenção ao caixa: saldo baixo. Considere vender ou reduzir folha.`);
  else items.push(`Finanças ok: use o mercado para fortalecer posições-chave.`);

  // item 5: identidade
  if (team?.name) items.push(`Objetivo do clube: colocar ${team.name} no topo e conquistar títulos.`);

  items.slice(0, 6).forEach((txt) => {
    const it = el("div", "news-item");
    it.appendChild(el("div", "news-dot", "•"));
    it.appendChild(el("div", "news-text", txt));
    box.appendChild(it);
  });
}

/* =======================================================
   LOBBY – Função principal (AAA)
   =======================================================*/
function carregarLobbyAAA() {
  console.log("[MAIN] carregarLobbyAAA()");

  const gs = window.gameState || {};

  if (!gs.selectedTeamId && !(window.Game && Game.teamId)) {
    console.warn("[MAIN] Nenhum time selecionado para o lobby.");
    return;
  }

  const teamId = gs.selectedTeamId || Game.teamId;
  const team = getTeamById(teamId);

  if (!team) {
    console.error("[MAIN] Time inválido no lobby:", teamId);
    return;
  }

  if (window.Game) Game.teamId = teamId;
  if (window.gameState) gameState.currentTeamId = teamId;

  const lobbyNome = document.getElementById("lobby-nome-time");
  const lobbySaldo = document.getElementById("lobby-saldo");
  const lobbyTemp = document.getElementById("lobby-temporada");
  const lobbyLogo = document.getElementById("lobby-logo");

  safeText(lobbyNome, team.name);

  const bal = (gs.balance != null ? gs.balance : (window.Game ? Game.saldo : 0));
  safeText(lobbySaldo, "Saldo: " + fmtMoneyMi(bal));
  safeText(lobbyTemp, "Temporada: " + (gs.seasonYear ?? 2025));

  if (lobbyLogo) {
    lobbyLogo.style.display = "block";
    lobbyLogo.src = `assets/logos/${team.id}.png`;
    lobbyLogo.alt = team.name;
    lobbyLogo.onerror = () => {
      console.warn("[MAIN] Escudo não encontrado para:", team.id);
      lobbyLogo.src = "assets/logos/default.png";
    };
  }

  // AAA: fase
  const faseEl = document.getElementById("lobby-fase");
  safeText(faseEl, `FASE: ${getPhaseLabel()}`);

  // AAA: próximo jogo
  const division = getDivisionForTeam(team);
  const next = getNextMatchInfo(teamId, division);
  safeText(document.getElementById("lobby-next-title"), next.title);
  safeText(document.getElementById("lobby-next-sub"), next.sub);
  safeText(document.getElementById("lobby-next-date"), next.date);

  // AAA: mini-tabela
  renderMiniTable(teamId, division);

  // AAA: regionais
  renderRegionalsSummary();

  // AAA: news
  renderNews(teamId, division);
}

/* =======================================================
   NAVEGAÇÃO CENTRALIZADA (SOBRESCREVE UI ANTIGO)
   =======================================================*/
window.UI = Object.assign(window.UI || {}, {
  // -------- Telas básicas --------
  voltarParaCapa() {
    console.log("[UI] voltarParaCapa()");
    mostrarTela("tela-capa");
  },

  voltarLobby() {
    console.log("[UI] voltarLobby()");
    carregarLobbyAAA();
    mostrarTela("tela-lobby");
  },

  // -------- Jogo / Partida --------
  abrirProximoJogo() {
    console.log("[UI] abrirProximoJogo()");
    if (window.League && typeof League.prepararProximoJogo === "function") {
      League.prepararProximoJogo();
    } else if (window.Match && typeof Match.iniciarProximoJogo === "function") {
      Match.iniciarProximoJogo();
    }
    mostrarTela("tela-partida");
  },

  // -------- Tabelas --------
  abrirClassificacao() {
    console.log("[UI] abrirClassificacao()");
    if (window.LeagueUI && typeof LeagueUI.renderStandings === "function") {
      LeagueUI.renderStandings();
    }
    mostrarTela("tela-classificacao");
  },

  // -------- Elenco --------
  abrirElenco() {
    console.log("[UI] abrirElenco()");
    if (window.TeamUI && typeof TeamUI.renderTeamSquad === "function") {
      TeamUI.renderTeamSquad();
    }
    mostrarTela("tela-elenco");
  },

  // -------- Mercado --------
  abrirMercado() {
    console.log("[UI] abrirMercado()");
    if (window.MarketUI && typeof MarketUI.renderMarket === "function") {
      MarketUI.renderMarket();
    }
    mostrarTela("tela-mercado");
  },

  // -------- Táticas --------
  abrirTaticas() {
    console.log("[UI] abrirTaticas()");
    if (window.TacticsUI && typeof TacticsUI.renderTactics === "function") {
      TacticsUI.renderTactics();
    }
    mostrarTela("tela-taticas");
  },

  // -------- Calendário --------
  abrirCalendarioAnual() {
    console.log("[UI] abrirCalendarioAnual()");
    if (window.CalendarUI && typeof CalendarUI.renderCalendar === "function") {
      CalendarUI.renderCalendar();
    }
    mostrarTela("tela-calendario");
  },

  // -------- Salvar --------
  salvarCarreira() {
    console.log("[UI] salvarCarreira()");
    if (window.Save && typeof Save.exportarJSON === "function") {
      Save.exportarJSON();
    } else {
      alert("Sistema de salvamento JSON não está disponível.");
    }
  },
});

console.log("[MAIN] Navegação UI sobrescrita com sucesso.");

/* =======================================================
   INICIALIZAÇÃO
   =======================================================*/
document.addEventListener("DOMContentLoaded", () => {
  configurarBotoes();
});