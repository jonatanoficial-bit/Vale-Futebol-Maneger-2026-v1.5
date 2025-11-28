// ui/league-ui.js
// ============================================
// Interface principal do Vale Futebol Manager 2026
// - Controla navegação entre telas
// - Renderiza TABELA, ELENCO e TÁTICAS
// ============================================

(function () {
  // ---------- HELPERS BÁSICOS ----------

  function mostrarTela(id) {
    const telas = document.querySelectorAll(".tela");
    telas.forEach(t => t.classList.remove("ativa"));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add("ativa");
  }

  function getTeamByIdSafe(teamId) {
    try {
      if (typeof getTeamById === "function") {
        return getTeamById(teamId);
      }
    } catch (e) {}
    if (window.Database && Array.isArray(Database.teams)) {
      return Database.teams.find(t => t.id === teamId) || null;
    }
    return null;
  }

  function getCurrentDivision() {
    if (window.gameState && gameState.currentDivision) {
      return gameState.currentDivision; // "A" ou "B"
    }
    // fallback: se não existir, assume Série A
    return "A";
  }

  // Pega elenco do time atual (tentando vários formatos possíveis)
  function getSquadForCurrentTeam() {
    const teamId = window.Game && Game.teamId ? Game.teamId : null;
    if (!teamId) return [];

    // 1) playersByTeam: { FLA: [...], PAL: [...] }
    if (window.Database && Database.playersByTeam && Database.playersByTeam[teamId]) {
      return Database.playersByTeam[teamId];
    }

    // 2) lista única de players com teamId
    if (window.Database && Array.isArray(Database.players)) {
      return Database.players.filter(p => p.teamId === teamId);
    }

    // 3) fallback vazio
    return [];
  }

  // Pega classificação da divisão atual, tentando ler da engine
  function getStandingsForCurrentDivision() {
    const div = getCurrentDivision();

    // 1) se a engine tiver um helper pronto
    if (window.League && typeof League.getStandingsForCurrentDivision === "function") {
      try {
        const data = League.getStandingsForCurrentDivision();
        if (Array.isArray(data)) return data;
      } catch (e) {
        console.warn("Erro ao chamar League.getStandingsForCurrentDivision:", e);
      }
    }

    // 2) se gameState tiver standings
    if (window.gameState && gameState.standings && gameState.standings[div]) {
      return gameState.standings[div];
    }

    // 3) fallback: monta uma classificação zerada
    if (window.Database && Array.isArray(Database.teams)) {
      const lista = Database.teams.filter(t => (t.division || "A") === div);
      return lista.map((t, idx) => ({
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

    return [];
  }

  // ---------- RENDER: TABELA ----------

  function renderTabelaBrasileirao() {
    const tabelaEl = document.getElementById("tabela-classificacao");
    if (!tabelaEl) return;

    const standings = getStandingsForCurrentDivision();
    const div = getCurrentDivision();

    tabelaEl.innerHTML = "";

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
      const team = getTeamByIdSafe(row.teamId);
      const nome =
        (team && team.name) ||
        row.name ||
        row.teamName ||
        row.teamId ||
        "Time";

      const logoSrc = team ? `assets/logos/${team.id}.png` : "";
      const pts = row.pts ?? row.points ?? 0;
      const j = row.j ?? row.games ?? 0;
      const v = row.v ?? row.wins ?? 0;
      const e = row.e ?? row.draws ?? 0;
      const d = row.d ?? row.losses ?? 0;
      const gp = row.gp ?? row.goalsFor ?? 0;
      const gc = row.gc ?? row.goalsAgainst ?? 0;

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

  // ---------- RENDER: ELENCO ----------

  function renderElenco() {
    const container = document.getElementById("elenco-lista");
    if (!container) return;

    const elenco = getSquadForCurrentTeam();
    container.innerHTML = "";

    if (!elenco.length) {
      container.innerHTML = "<p>Nenhum jogador encontrado para este time.</p>";
      return;
    }

    elenco.forEach(p => {
      const nome = p.name || p.nome || "Jogador";
      const pos =
        p.position || p.posicao || p.pos || p.role || "POS";
      const ovr =
        p.ovr ?? p.rating ?? p.overall ?? 70;
      const faceId = p.faceId || p.id || "";
      const imgSrc = faceId
        ? `assets/face/${faceId}.png`
        : "assets/geral/sem_foto.png";

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

  // ---------- RENDER: TÁTICAS (visual simples 4-3-3) ----------

  function renderTaticas() {
    const campo = document.getElementById("campo-tatico");
    const banco = document.getElementById("banco-reservas");
    if (!campo || !banco) return;

    const elenco = getSquadForCurrentTeam();
    campo.innerHTML = "";
    banco.innerHTML = "";

    if (!elenco.length) {
      campo.innerHTML = "<p style='padding:10px;color:#fff'>Nenhum jogador carregado.</p>";
      return;
    }

    // primeiros 11 como titulares
    const titulares = elenco.slice(0, 11);
    const reservas = elenco.slice(11);

    // posições (4-3-3 genérico) em porcentagem
    const slotsPos = [
      { x: 50, y: 90 }, // GOL
      { x: 20, y: 70 }, // ZAG 1
      { x: 40, y: 70 }, // ZAG 2
      { x: 60, y: 70 }, // ZAG 3 / LAT
      { x: 80, y: 70 }, // ZAG 4 / LAT
      { x: 25, y: 50 }, // MEI 1
      { x: 50, y: 50 }, // MEI 2
      { x: 75, y: 50 }, // MEI 3
      { x: 25, y: 30 }, // ATA 1
      { x: 50, y: 30 }, // ATA 2
      { x: 75, y: 30 }  // ATA 3
    ];

    titulares.forEach((p, idx) => {
      const pos = slotsPos[idx] || { x: 50, y: 50 };
      const nome = p.name || p.nome || "Jogador";
      const posicao =
        p.position || p.posicao || p.pos || p.role || "POS";
      const ovr =
        p.ovr ?? p.rating ?? p.overall ?? 70;
      const faceId = p.faceId || p.id || "";
      const imgSrc = faceId
        ? `assets/face/${faceId}.png`
        : "assets/geral/sem_foto.png";

      const slot = document.createElement("div");
      slot.className = "slot-jogador";
      slot.style.left = pos.x + "%";
      slot.style.top = pos.y + "%";

      slot.innerHTML = `
        <div class="slot-card">
          <img src="${imgSrc}" alt="${nome}" onerror="this.style.display='none'">
          <div>${nome}</div>
          <div>${posicao} · OVR ${ovr}</div>
        </div>
      `;
      campo.appendChild(slot);
    });

    // reservas (lista na direita)
    reservas.forEach(p => {
      const nome = p.name || p.nome || "Jogador";
      const posicao =
        p.position || p.posicao || p.pos || p.role || "POS";
      const ovr =
        p.ovr ?? p.rating ?? p.overall ?? 70;
      const faceId = p.faceId || p.id || "";
      const imgSrc = faceId
        ? `assets/face/${faceId}.png`
        : "assets/geral/sem_foto.png";

      const linha = document.createElement("div");
      linha.className = "reserva-card";
      linha.innerHTML = `
        <img src="${imgSrc}" alt="${nome}" onerror="this.style.display='none'">
        <div>${nome}</div>
        <div>${posicao} · OVR ${ovr}</div>
      `;
      banco.appendChild(linha);
    });
  }

  // ---------- OBJETO UI GLOBAL ----------

  const UI = {
    init() {
      // não precisa fazer muita coisa aqui, o main.js cuida do resto
      console.log("[UI] Interface carregada.");
    },

    // Navegação
    voltarParaCapa() {
      mostrarTela("tela-capa");
    },
    voltarLobby() {
      mostrarTela("tela-lobby");
    },

    // Lobby
    abrirProximoJogo() {
      // se existir lógica de partida, chama
      if (window.Match && typeof Match.iniciarProximoJogo === "function") {
        Match.iniciarProximoJogo();
      }
      mostrarTela("tela-partida");
    },

    abrirClassificacao() {
      renderTabelaBrasileirao();
      mostrarTela("tela-classificacao");
    },

    abrirElenco() {
      renderElenco();
      mostrarTela("tela-elenco");
    },

    abrirTaticas() {
      renderTaticas();
      mostrarTela("tela-taticas");
    },

    abrirMercado() {
      // se você tiver uma engine de mercado, pode chamar aqui
      mostrarTela("tela-mercado");
    }
  };

  // expõe global
  window.UI = UI;
})();
