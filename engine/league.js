// ui/league-ui.js
// ======================================================
// UI principal: Tabela, Elenco, Táticas, Navegação e Capa
// Versão robusta com MUITOS fallbacks e logs de debug
// ======================================================

(function () {
  console.log("%c[UI] league-ui.js carregado", "color:#0EA5E9; font-weight:bold;");

  // ---------------- HELPERS GERAIS ----------------

  function mostrarTela(id) {
    document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add("ativa");
  }

  function getCurrentTeamId() {
    if (window.Game && Game.teamId) return Game.teamId;
    if (window.gameState && gameState.currentTeamId) return gameState.currentTeamId;
    return null;
  }

  function getDivisionForTeam(team) {
    if (!team) return "A";
    return team.division || team.serie || "A";
  }

  function getAllTeams() {
    if (window.Database && Array.isArray(Database.teams)) return Database.teams;
    if (Array.isArray(window.teams)) return teams;
    return [];
  }

  function getTeamByIdSafe(teamId) {
    if (!teamId) return null;

    try {
      if (typeof getTeamById === "function") {
        const t = getTeamById(teamId);
        if (t) return t;
      }
    } catch (e) {
      console.warn("[UI] erro em getTeamById:", e);
    }

    const all = getAllTeams();
    const t2 = all.find(tm => tm.id === teamId);
    if (t2) return t2;

    return null;
  }

  // ---------------- LOBBY / CABEÇALHO ----------------

  function atualizarLobby() {
    const teamId = getCurrentTeamId();
    const team = getTeamByIdSafe(teamId);

    const nomeEl  = document.getElementById("lobby-nome-time");
    const tempEl  = document.getElementById("lobby-temporada");
    const saldoEl = document.getElementById("lobby-saldo");
    const logoEl  = document.getElementById("lobby-logo");

    if (team && nomeEl) nomeEl.textContent = team.name;
    if (logoEl && team) {
      logoEl.src = `assets/logos/${team.id}.png`;
      logoEl.alt = team.name;
    }

    if (tempEl && window.gameState) {
      tempEl.textContent = `Temporada: ${gameState.seasonYear || 2025}`;
    }
    if (saldoEl && window.gameState) {
      const bal = (gameState.balance ?? 0);
      saldoEl.textContent = `Saldo: ${bal} mi`;
    }
  }

  // ---------------- ESCOLHA DE TIME ----------------

  function preencherListaTimes() {
    const container = document.getElementById("lista-times");
    if (!container) {
      console.warn("[UI] lista de times (#lista-times) não encontrada.");
      return;
    }

    const teams = getAllTeams();
    console.log("[UI] preencherListaTimes() – times encontrados:", teams.length);

    container.innerHTML = "";

    if (!teams.length) {
      container.innerHTML = "<p style='color:#fff;'>Nenhum time encontrado no database.</p>";
      return;
    }

    teams.forEach(team => {
      const card = document.createElement("button");
      card.className = "time-card";
      card.innerHTML = `
        <div class="time-card-inner">
          <img
            src="assets/logos/${team.id}.png"
            alt="${team.name}"
            class="time-logo"
            onerror="this.style.display='none'"
          >
          <div class="time-nome">${team.name}</div>
        </div>
      `;
      card.addEventListener("click", () => iniciarNovaCarreira(team.id));
      container.appendChild(card);
    });
  }

  function iniciarNovaCarreira(teamId) {
    console.log("[UI] iniciarNovaCarreira para time:", teamId);
    const nomeTecnico = prompt("Nome do treinador:", "Técnico") || "Técnico";

    // Engine oficial (se existir)
    if (typeof resetGameStateForNewCareer === "function") {
      resetGameStateForNewCareer(teamId, nomeTecnico);
    } else {
      // fallback simples: só preenche Game
      if (!window.gameState) window.gameState = {};
      gameState.currentTeamId = teamId;
      gameState.seasonYear = gameState.seasonYear || 2025;
      gameState.balance = gameState.balance ?? 50;
    }

    if (!window.Game) window.Game = {};
    Game.teamId = teamId;
    Game.coachName = nomeTecnico;

    atualizarLobby();
    mostrarTela("tela-lobby");
  }

  // ----------- STANDINGS / TABELA -----------

  function getStandingsForDivision(div) {
    // 1) Engine League nova
    if (window.League && typeof League.getStandingsForCurrentDivision === "function") {
      try {
        const lista = League.getStandingsForCurrentDivision(div);
        if (Array.isArray(lista) && lista.length) return lista;
      } catch (e) {
        console.warn("[UI] erro League.getStandingsForCurrentDivision:", e);
      }
    }

    // 2) gameState.standings
    if (window.gameState && gameState.standings && gameState.standings[div]) {
      const lista = gameState.standings[div];
      if (Array.isArray(lista) && lista.length) return lista;
    }

    // 3) fallback: monta tabela zerada com base apenas nos times
    const teams = getAllTeams().filter(t => (t.division || t.serie || "A") === div);
    return teams.map((t, idx) => ({
      position: idx + 1,
      teamId: t.id,
      name: t.name,
      pts: 0,
      j: 0,
      v: 0,
      e: 0,
      d: 0,
      gp: 0,
      gc: 0
    }));
  }

  function renderTabelaBrasileirao() {
    const tabelaEl = document.getElementById("tabela-classificacao");
    if (!tabelaEl) {
      console.warn("[UI] #tabela-classificacao não encontrado.");
      return;
    }

    const teamId = getCurrentTeamId();
    const team = getTeamByIdSafe(teamId);
    const div = getDivisionForTeam(team); // “A” ou “B”

    console.log("[UI] renderTabelaBrasileirao() para divisão:", div, "time atual:", teamId);

    const standings = getStandingsForDivision(div);

    tabelaEl.innerHTML = "";

    if (!standings || !standings.length) {
      tabelaEl.innerHTML = `
        <tr><td>Não há dados de classificação para esta divisão.</td></tr>
      `;
      return;
    }

    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `
      <th>#</th>
      <th>Time (${div === "B" ? "Série B" : "Série A"})</th>
      <th>Pts</th>
      <th>J</th>
      <th>V</th>
      <th>E</th>
      <th>D</th>
      <th>G+</th>
      <th>G-</th>
    `;
    tabelaEl.appendChild(headerRow);

    standings.forEach((row, index) => {
      const t = getTeamByIdSafe(row.teamId) ||
                getTeamByIdSafe(row.id)     ||
                { name: row.name || row.teamName || "Time" };

      const nome = t.name;
      const logoSrc = t.id ? `assets/logos/${t.id}.png` : "";
      const pts = row.pts ?? row.points ?? 0;
      const j   = row.j   ?? row.games  ?? 0;
      const v   = row.v   ?? row.wins   ?? 0;
      const e   = row.e   ?? row.draws  ?? 0;
      const d   = row.d   ?? row.losses ?? 0;
      const gp  = row.gp  ?? row.goalsFor     ?? 0;
      const gc  = row.gc  ?? row.goalsAgainst ?? 0;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${index + 1}</td>
        <td class="time-coluna">
          ${logoSrc ? `<img class="logo-tabela" src="${logoSrc}" alt="${nome}" onerror="this.style.display='none'">` : ""}
          <span>${nome}</span>
        </td>
        <td>${pts}</td>
        <td>${j}</td>
        <td>${v}</td>
        <td>${e}</td>
        <td>${d}</td>
        <td>${gp}</td>
        <td>${gc}</td>
      `;
      tabelaEl.appendChild(tr);
    });
  }

  // ----------- ELENCO / JOGADORES -----------

  function getSquadForCurrentTeam() {
    const teamId = getCurrentTeamId();
    if (!teamId) {
      console.warn("[UI] getSquadForCurrentTeam: sem teamId.");
      return [];
    }

    if (window.Database && Database.playersByTeam && Array.isArray(Database.playersByTeam[teamId])) {
      return Database.playersByTeam[teamId];
    }

    if (window.Database && Array.isArray(Database.players)) {
      const lista = Database.players.filter(p => p.teamId === teamId);
      if (lista.length) return lista;
    }

    if (window.gameState && gameState.squads && Array.isArray(gameState.squads[teamId])) {
      return gameState.squads[teamId];
    }

    if (window.gameState && Array.isArray(gameState.currentSquad)) {
      return gameState.currentSquad;
    }

    console.warn("[UI] Nenhum elenco encontrado para o time", teamId);
    return [];
  }

  function getFacePathForPlayer(p) {
    const faceId = p.faceId || p.id || p.code || "";
    if (!faceId) return "assets/geral/sem_foto.png";
    return `assets/face/${faceId}.png`;
  }

  function renderElenco() {
    const container = document.getElementById("elenco-lista");
    if (!container) {
      console.warn("[UI] #elenco-lista não encontrado.");
      return;
    }

    const elenco = getSquadForCurrentTeam();
    console.log("[UI] renderElenco() – jogadores encontrados:", elenco.length);

    container.innerHTML = "";

    if (!elenco.length) {
      container.innerHTML = `
        <p style="padding:10px;">
          Nenhum jogador encontrado para este time.
        </p>
      `;
      return;
    }

    elenco.forEach(p => {
      const nome = p.name || p.nome || "Jogador";
      const pos  = p.position || p.posicao || p.pos || p.role || "POS";
      const ovr  = p.ovr ?? p.rating ?? p.overall ?? 70;
      const imgSrc = getFacePathForPlayer(p);

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

  // ----------- TÁTICAS / CAMPO -----------

  function renderTaticas() {
    const campo = document.getElementById("campo-tatico");
    const banco = document.getElementById("banco-reservas");
    if (!campo || !banco) {
      console.warn("[UI] #campo-tatico ou #banco-reservas não encontrados.");
      return;
    }

    const elenco = getSquadForCurrentTeam();
    console.log("[UI] renderTaticas() – jogadores:", elenco.length);

    campo.innerHTML = "";
    banco.innerHTML = "";

    if (!elenco.length) {
      campo.innerHTML = `
        <p style="padding:10px;color:#fff;">
          Nenhum jogador carregado para este time.
        </p>
      `;
      return;
    }

    const titulares = elenco.slice(0, 11);
    const reservas  = elenco.slice(11);

    const slotsPos = [
      { x: 50, y: 88 }, // GOL
      { x: 20, y: 70 },
      { x: 40, y: 70 },
      { x: 60, y: 70 },
      { x: 80, y: 70 },
      { x: 25, y: 52 },
      { x: 50, y: 52 },
      { x: 75, y: 52 },
      { x: 25, y: 32 },
      { x: 50, y: 30 },
      { x: 75, y: 32 }
    ];

    titulares.forEach((p, idx) => {
      const posCampo = slotsPos[idx] || { x: 50, y: 50 };
      const nome = p.name || p.nome || "Jogador";
      const pos  = p.position || p.posicao || p.pos || p.role || "POS";
      const ovr  = p.ovr ?? p.rating ?? p.overall ?? 70;
      const img  = getFacePathForPlayer(p);

      const slot = document.createElement("div");
      slot.className = "slot-jogador";
      slot.style.left = posCampo.x + "%";
      slot.style.top  = posCampo.y + "%";

      slot.innerHTML = `
        <div class="slot-card">
          <img src="${img}" alt="${nome}" onerror="this.style.display='none'">
          <div>${nome}</div>
          <div>${pos} · OVR ${ovr}</div>
        </div>
      `;
      campo.appendChild(slot);
    });

    reservas.forEach(p => {
      const nome = p.name || p.nome || "Jogador";
      const pos  = p.position || p.posicao || p.pos || p.role || "POS";
      const ovr  = p.ovr ?? p.rating ?? p.overall ?? 70;
      const img  = getFacePathForPlayer(p);

      const linha = document.createElement("div");
      linha.className = "reserva-card";
      linha.innerHTML = `
        <img src="${img}" alt="${nome}" onerror="this.style.display='none'">
        <div>${nome}</div>
        <div>${pos} · OVR ${ovr}</div>
      `;
      banco.appendChild(linha);
    });
  }

  // ---------------- OBJETO UI GLOBAL ----------------

  const UI = {
    init() {
      console.log("%c[UI] init() chamado (league-ui).", "color:#C7A029; font-weight:bold;");

      const btnIniciar = document.getElementById("btn-iniciar");
      if (btnIniciar) {
        btnIniciar.addEventListener("click", () => {
          console.log("[UI] clique em INICIAR CARREIRA");
          UI.abrirEscolhaTime();
        });
      }

      const btnContinuar = document.getElementById("btn-continuar");
      if (btnContinuar) {
        btnContinuar.addEventListener("click", () => {
          console.log("[UI] clique em CONTINUAR CARREIRA");
          UI.continuarCarreira();
        });
      }
    },

    // CAPA
    abrirEscolhaTime() {
      console.log("[UI] abrirEscolhaTime() disparado.");
      preencherListaTimes();
      mostrarTela("tela-escolha-time");
    },

    continuarCarreira() {
      console.log("[UI] continuarCarreira() disparado.");
      // Se futuramente houver sistema de save, podemos tentar carregar aqui.
      // Por enquanto, se não houver save, abre escolha de time.
      UI.abrirEscolhaTime();
    },

    voltarParaCapa() {
      mostrarTela("tela-capa");
    },

    voltarLobby() {
      mostrarTela("tela-lobby");
    },

    // NAVEGAÇÃO PRINCIPAL
    abrirProximoJogo() {
      if (window.Match && typeof Match.iniciarProximoJogo === "function") {
        Match.iniciarProximoJogo();
      }
      mostrarTela("tela-partida");
    },

    abrirClassificacao() {
      console.log("[UI] abrirClassificacao() disparado.");
      renderTabelaBrasileirao();
      mostrarTela("tela-classificacao");
    },

    abrirElenco() {
      console.log("[UI] abrirElenco() disparado.");
      renderElenco();
      mostrarTela("tela-elenco");
    },

    abrirTaticas() {
      console.log("[UI] abrirTaticas() disparado.");
      renderTaticas();
      mostrarTela("tela-taticas");
    },

    abrirMercado() {
      console.log("[UI] abrirMercado() disparado.");
      mostrarTela("tela-mercado");
    }
  };

  // Mescla com qualquer UI já existente (ex.: ui.js),
  // em vez de sobrescrever tudo.
  window.UI = Object.assign(window.UI || {}, UI);
})();
