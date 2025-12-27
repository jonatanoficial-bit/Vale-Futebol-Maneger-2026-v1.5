// Ui/ui.js
// ======================================================
// UI principal do Vale Futebol Manager 2026 (AAA)
// Navegação entre telas + integração com Calendar/Match
// - Próximo Jogo: usa Calendar.consumeNextEvent() com contexto
// - Mercado: usa MarketUI.renderMarket()
// - Calendário: usa CalendarUI.renderCalendar()
// - Elenco: usa TeamUI.renderTeamSquad()
// - Táticas: usa TacticsUI.renderTactics()
// - Tabela: usa LeagueUI.renderTabelaBrasileirao() se existir
// ======================================================

(function () {
  console.log("%c[UI] ui.js (AAA) carregado", "color:#0EA5E9; font-weight:bold;");

  // ----------------------------------------------------
  // HELPERS
  // ----------------------------------------------------
  function mostrarTela(id) {
    document.querySelectorAll(".tela").forEach((t) => t.classList.remove("ativa"));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add("ativa");
    else console.warn("[UI] mostrarTela: elemento não encontrado:", id);
  }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.seasonYear) gs.seasonYear = 2026;
    if (gs.money == null) gs.money = 50;
    return gs;
  }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }

  function getTeamById(id) {
    return getTeams().find(t => String(t.id) === String(id)) || null;
  }

  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  function teamDivision(teamId) {
    const t = getTeamById(teamId);
    return String(t?.division || t?.serie || "A").toUpperCase();
  }

  function setLobbyHeader() {
    const teamId = getUserTeamId();
    const t = teamId ? getTeamById(teamId) : null;

    const logo = document.getElementById("lobby-logo");
    const nome = document.getElementById("lobby-nome-time");
    const temporada = document.getElementById("lobby-temporada");
    const saldo = document.getElementById("lobby-saldo");
    const fase = document.getElementById("lobby-fase");

    if (logo) {
      if (t) {
        logo.src = `assets/logos/${t.id}.png`;
        logo.onerror = () => { logo.src = "assets/logos/default.png"; };
      } else {
        logo.src = "assets/logos/default.png";
      }
    }

    if (nome) nome.textContent = t ? t.name : "Selecione um time";
    if (temporada) temporada.textContent = `Temporada ${ensureGS().seasonYear}`;
    if (saldo) saldo.textContent = `Saldo: R$ ${Number(ensureGS().money).toFixed(1)} mi`;
    if (fase) fase.textContent = t ? `DIVISÃO: ${teamDivision(teamId)}` : "FASE: —";
  }

  function renderMiniTable() {
    const box = document.getElementById("lobby-mini-table");
    if (!box) return;
    box.innerHTML = "";

    if (!window.League || typeof League.getStandingsForCurrentDivision !== "function") {
      box.innerHTML = `<div class="mini-muted">Tabela indisponível.</div>`;
      return;
    }

    const standings = League.getStandingsForCurrentDivision();
    if (!Array.isArray(standings) || !standings.length) {
      box.innerHTML = `<div class="mini-muted">Sem dados de tabela.</div>`;
      return;
    }

    const top = standings.slice(0, 6);
    top.forEach((row, i) => {
      const div = document.createElement("div");
      div.className = "mini-row";
      div.textContent = `${i + 1}. ${row.name} (${row.pts} pts)`;
      box.appendChild(div);
    });
  }

  function renderLobbyNextMatch() {
    const title = document.getElementById("lobby-next-title");
    const sub = document.getElementById("lobby-next-sub");
    const date = document.getElementById("lobby-next-date");

    if (!title || !sub || !date) return;

    const teamId = getUserTeamId();
    if (!teamId) {
      title.textContent = "—";
      sub.textContent = "Selecione um time";
      date.textContent = "—";
      return;
    }

    // Preferir Calendar
    let ev = null;
    try {
      if (window.Calendar && typeof Calendar.getNextEvent === "function") {
        ev = Calendar.getNextEvent(teamId);
      }
    } catch (e) {}

    // Fallback: League.prepararProximoJogo
    if (!ev) {
      try {
        if (window.League && typeof League.prepararProximoJogo === "function") {
          const fx = League.prepararProximoJogo();
          if (fx) {
            ev = {
              date: fx.date || "—",
              comp: "LEAGUE",
              competitionName: fx.competitionName || "Campeonato Brasileiro",
              homeId: fx.homeId,
              awayId: fx.awayId,
              roundNumber: fx.roundNumber || fx.round || null,
              division: fx.division || teamDivision(teamId)
            };
          }
        }
      } catch (e) {}
    }

    if (!ev) {
      title.textContent = "Sem calendário";
      sub.textContent = "Use PRÓXIMO JOGO para gerar";
      date.textContent = "—";
      return;
    }

    const compName = ev.competitionName || ev.title || "Partida";
    const home = getTeamById(ev.homeId)?.name || String(ev.homeId || "Casa");
    const away = getTeamById(ev.awayId)?.name || String(ev.awayId || "Fora");

    title.textContent = compName;
    sub.textContent = `${home} vs ${away}`;
    date.textContent = String(ev.date || "—");
  }

  function renderLobbyNews() {
    const box = document.getElementById("lobby-news");
    if (!box) return;
    box.innerHTML = "";

    try {
      if (window.News && typeof News.getLatest === "function") {
        const latest = News.getLatest(6);
        if (Array.isArray(latest) && latest.length) {
          latest.forEach(n => {
            const div = document.createElement("div");
            div.className = "news-row";
            div.textContent = `• ${n.title || n.titulo || "Notícia"} — ${n.body || n.text || ""}`.slice(0, 120);
            box.appendChild(div);
          });
          return;
        }
      }
    } catch (e) {}

    box.innerHTML = `<div class="mini-muted">Sem notícias no momento.</div>`;
  }

  function renderLobbyRegionals() {
    const box = document.getElementById("lobby-regionais");
    if (!box) return;
    box.innerHTML = "";

    // Placeholder simples (você já tem regionals engine; depois eu integro em detalhe)
    box.innerHTML = `<div class="mini-muted">Estaduais ativos no calendário (Jan–Mar).</div>`;
  }

  function atualizarLobby() {
    setLobbyHeader();
    renderMiniTable();
    renderLobbyNextMatch();
    renderLobbyNews();
    renderLobbyRegionals();
  }

  // ----------------------------------------------------
  // TELAS (Renderers)
  // ----------------------------------------------------
  function abrirMercadoTela() {
    if (window.MarketUI && typeof MarketUI.renderMarket === "function") {
      MarketUI.renderMarket();
    } else {
      const node = document.getElementById("lista-mercado");
      if (node) node.innerHTML = `<div class="mini-muted">MarketUI não encontrado.</div>`;
    }
    mostrarTela("tela-mercado");
  }

  function abrirCalendarioTela() {
    if (window.Calendar && typeof Calendar.ensure === "function") {
      try { Calendar.ensure(false); } catch (e) {}
    }
    if (window.CalendarUI && typeof CalendarUI.renderCalendar === "function") {
      CalendarUI.renderCalendar();
    } else {
      const node = document.getElementById("calendario-anual");
      if (node) node.innerHTML = `<div class="mini-muted">CalendarUI não encontrado.</div>`;
    }
    mostrarTela("tela-calendario");
  }

  function renderElenco() {
    if (window.TeamUI && typeof TeamUI.renderTeamSquad === "function") {
      TeamUI.renderTeamSquad();
    } else {
      const node = document.getElementById("lista-elenco");
      if (node) node.innerHTML = `<div class="mini-muted">TeamUI não encontrado.</div>`;
    }
  }

  function renderTaticas() {
    if (window.TacticsUI && typeof TacticsUI.renderTactics === "function") {
      TacticsUI.renderTactics();
    } else {
      alert("TacticsUI não encontrado.");
    }
  }

  function renderTabelaBrasileirao() {
    if (window.LeagueUI && typeof LeagueUI.renderTabelaBrasileirao === "function") {
      LeagueUI.renderTabelaBrasileirao();
    } else if (window.League && typeof League.getStandingsForCurrentDivision === "function") {
      // fallback simples
      const node = document.getElementById("tabela-classificacao");
      if (!node) return;
      const st = League.getStandingsForCurrentDivision() || [];
      node.innerHTML = "";
      const table = document.createElement("div");
      table.className = "mini-table";
      st.slice(0, 20).forEach((r, i) => {
        const div = document.createElement("div");
        div.className = "mini-row";
        div.textContent = `${i + 1}. ${r.name} — ${r.pts} pts (J ${r.pld})`;
        table.appendChild(div);
      });
      node.appendChild(table);
    } else {
      const node = document.getElementById("tabela-classificacao");
      if (node) node.innerHTML = `<div class="mini-muted">LeagueUI/League não encontrado.</div>`;
    }
  }

  // ----------------------------------------------------
  // PRÓXIMO JOGO (AAA) — Calendar + Contexto
  // ----------------------------------------------------
  function iniciarPartidaComEvento(ev) {
    const homeId = ev.homeId;
    const awayId = ev.awayId;

    // grava contexto global (Match.js lê isso)
    window.currentMatchContext = {
      competition: ev.comp || ev.competition || "LEAGUE",
      competitionName: ev.competitionName || ev.title || "Partida",
      roundNumber: ev.roundNumber || ev.round || null,
      division: ev.division || null,
      date: ev.date || null
    };

    // inicia match
    if (window.Match) {
      if (typeof Match._startMatch === "function") {
        Match._startMatch(homeId, awayId, window.currentMatchContext);
      } else if (typeof Match.iniciarProximoJogo === "function") {
        // fallback (se seu match antigo existisse)
        Match.iniciarProximoJogo();
      } else {
        alert("Engine de partida (Match) não encontrada.");
        return;
      }
    } else {
      alert("Match não encontrado.");
      return;
    }

    mostrarTela("tela-partida");
  }

  function abrirProximoJogoAAA() {
    const teamId = getUserTeamId();
    if (!teamId) {
      alert("Selecione um time primeiro!");
      mostrarTela("tela-escolha-time");
      return;
    }

    // garantir Calendar
    try { if (window.Calendar && typeof Calendar.ensure === "function") Calendar.ensure(false); } catch (e) {}

    // pega próximo evento e consome
    let ev = null;
    try {
      if (window.Calendar && typeof Calendar.consumeNextEvent === "function") {
        ev = Calendar.consumeNextEvent(teamId);
      }
    } catch (e) {}

    // fallback: League.prepararProximoJogo()
    if (!ev) {
      try {
        if (window.League && typeof League.prepararProximoJogo === "function") {
          const fx = League.prepararProximoJogo();
          if (fx) {
            ev = {
              date: fx.date || null,
              comp: "LEAGUE",
              competitionName: fx.competitionName || "Campeonato Brasileiro",
              homeId: fx.homeId,
              awayId: fx.awayId,
              roundNumber: fx.roundNumber || fx.round || null,
              division: fx.division || teamDivision(teamId)
            };
          }
        }
      } catch (e) {}
    }

    if (!ev || !ev.homeId || !ev.awayId) {
      // último fallback: Match.iniciarProximoJogo
      if (window.Match && typeof Match.iniciarProximoJogo === "function") {
        try { Match.iniciarProximoJogo(); mostrarTela("tela-partida"); return; } catch (e) {}
      }
      alert("Não foi possível encontrar o próximo jogo no calendário.");
      return;
    }

    iniciarPartidaComEvento(ev);
  }

  // ----------------------------------------------------
  // SALVAR JSON
  // ----------------------------------------------------
  function salvarCarreiraJSON() {
    ensureGS();
    try {
      if (!window.Save || typeof Save.exportJSON !== "function") {
        alert("Save.exportJSON não encontrado.");
        return;
      }
      Save.exportJSON();
    } catch (e) {
      console.warn("[UI] erro ao salvar JSON:", e);
      alert("Erro ao salvar.");
    }
  }

  // ----------------------------------------------------
  // MODAL CAMPEÃO (compat)
  // ----------------------------------------------------
  function showChampionModal(title, msg) {
    alert(`${title}\n\n${msg}`);
  }

  // ----------------------------------------------------
  // API UI
  // ----------------------------------------------------
  const UI = {
    init() {
      console.log("%c[UI] init() chamado (AAA).", "color:#C7A029; font-weight:bold;");
    },

    // navegação
    voltarParaCapa() { mostrarTela("tela-capa"); },

    voltarLobby() {
      atualizarLobby();
      mostrarTela("tela-lobby");
    },

    // seleção de time
    abrirEscolhaTime() {
      if (window.TeamUI && typeof TeamUI.renderTeamSelection === "function") {
        TeamUI.renderTeamSelection();
      }
      mostrarTela("tela-escolha-time");
    },

    // LOBBY
    abrirLobby() {
      atualizarLobby();
      mostrarTela("tela-lobby");
    },

    // PRÓXIMO JOGO (AAA)
    abrirProximoJogo() {
      abrirProximoJogoAAA();
    },

    // TABELA
    abrirClassificacao() {
      renderTabelaBrasileirao();
      mostrarTela("tela-classificacao");
    },

    // ELENCO
    abrirElenco() {
      renderElenco();
      mostrarTela("tela-elenco");
    },

    // TÁTICAS
    abrirTaticas() {
      renderTaticas();
      mostrarTela("tela-taticas");
    },

    // MERCADO
    abrirMercado() {
      abrirMercadoTela();
    },

    // CALENDÁRIO (compat + alias do index)
    abrirCalendario() { abrirCalendarioTela(); },
    abrirCalendarioAnual() { abrirCalendarioTela(); },

    // SALVAR
    salvarCarreira() { salvarCarreiraJSON(); },

    // atualização manual
    atualizarLobby() { atualizarLobby(); }
  };

  UI.showChampionModal = showChampionModal;

  // complementa sem sobrescrever
  window.UI = Object.assign(window.UI || {}, UI);
})();