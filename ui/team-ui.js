/* =======================================================
   Ui/team-ui.js – Vale Futebol Manager 2026 (AAA Fix v2)
   - Logos: detecta caminho correto (case-sensitive Vercel)
   - Seleção: NÃO depende de prompt() (evita travar no mobile)
   - Clique robusto: tenta main.js -> fallback próprio
   - Mantém TeamUI/TeamUi compatíveis
   ======================================================= */

(function () {
  "use strict";

  if (!window.TeamUI) window.TeamUI = {};
  if (!window.TeamUi) window.TeamUi = window.TeamUI;

  window.__TEAM_UI_REAL__ = true;

  function $(id) {
    return document.getElementById(id);
  }

  function getTeamsSource() {
    const teams =
      (window.Database && Array.isArray(Database.teams) && Database.teams) ||
      (window.teams && Array.isArray(window.teams) && window.teams) ||
      (typeof window.teams !== "undefined" && Array.isArray(window.teams) ? window.teams : []) ||
      [];
    // fallback: se engine/database.js usa variável global "teams"
    if ((!teams || !teams.length) && typeof window.teams === "undefined") {
      try {
        // eslint-disable-next-line no-undef
        if (typeof teams !== "undefined" && Array.isArray(teams)) return teams;
      } catch (e) {}
    }
    return teams;
  }

  function getDivisionLabel(team) {
    const d = (team?.division || team?.serie || "A").toString().toUpperCase();
    return d === "B" ? "Série B" : "Série A";
  }

  function showTela(id) {
    const telas = document.querySelectorAll(".tela");
    telas.forEach((t) => t.classList.remove("ativa"));
    const el = $(id);
    if (el) el.classList.add("ativa");
  }

  // -----------------------------
  // Detecta caminho correto dos logos
  // -----------------------------
  const LOGO_BASE_CANDIDATES = [
    "assets/logos",
    "assets/Logos",
    "Assets/logos",
    "Assets/Logos",
  ];

  let __logoBaseCache = null;
  let __logoBasePromise = null;

  function testImage(url, timeoutMs) {
    return new Promise((resolve) => {
      const img = new Image();
      let done = false;

      const t = setTimeout(() => {
        if (done) return;
        done = true;
        resolve(false);
      }, timeoutMs);

      img.onload = () => {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve(true);
      };

      img.onerror = () => {
        if (done) return;
        done = true;
        clearTimeout(t);
        resolve(false);
      };

      const sep = url.includes("?") ? "&" : "?";
      img.src = url + sep + "v=" + Date.now();
    });
  }

  async function detectLogoBase() {
    if (__logoBaseCache) return __logoBaseCache;
    if (__logoBasePromise) return __logoBasePromise;

    __logoBasePromise = (async () => {
      const teams = getTeamsSource();
      const probeId = teams && teams.length ? teams[0].id : "FLA";

      for (const base of LOGO_BASE_CANDIDATES) {
        const okPng = await testImage(`${base}/${probeId}.png`, 900);
        if (okPng) {
          __logoBaseCache = base;
          return base;
        }
        const okPNG = await testImage(`${base}/${probeId}.PNG`, 900);
        if (okPNG) {
          __logoBaseCache = base;
          return base;
        }
      }

      __logoBaseCache = "assets/logos";
      return __logoBaseCache;
    })();

    return __logoBasePromise;
  }

  async function setLogoSafe(imgEl, teamId) {
    const base = await detectLogoBase();
    const try1 = `${base}/${teamId}.png`;
    const try2 = `${base}/${teamId}.PNG`;

    imgEl.src = try1;
    imgEl.onerror = function () {
      if (imgEl.__triedPNG) {
        imgEl.style.display = "none";
        return;
      }
      imgEl.__triedPNG = true;
      imgEl.src = try2;
    };
  }

  function createLogoImg(teamId, altText) {
    const img = document.createElement("img");
    img.className = "time-card-logo";
    img.alt = altText || "Escudo";
    img.loading = "lazy";
    img.src = "";
    return img;
  }

  // -----------------------------
  // SELEÇÃO ROBUSTA (SEM prompt)
  // -----------------------------
  function safeCoachName() {
    // Sem prompt para evitar travas no mobile
    // Você pode depois criar uma tela modal própria pro nome.
    return (window.Game && Game.coachName) ? Game.coachName : "Técnico";
  }

  function setSelectedTeamState(teamId) {
    // Game (main.js)
    if (!window.Game) window.Game = {};
    Game.teamId = teamId;
    if (!Game.coachName) Game.coachName = safeCoachName();

    // save.js geralmente usa gameState
    if (!window.gameState) window.gameState = {};
    gameState.selectedTeamId = teamId;
    if (!gameState.coachName) gameState.coachName = Game.coachName;
  }

  function openLobbySafely() {
    try {
      if (typeof window.carregarLobby === "function") window.carregarLobby();
    } catch (e) {
      console.warn("[TEAM-UI] carregarLobby falhou:", e);
    }

    try {
      if (typeof window.mostrarTela === "function") {
        window.mostrarTela("tela-lobby");
        return;
      }
    } catch (e) {}

    // fallback: usa UI se existir
    try {
      if (window.UI && typeof UI.voltarLobby === "function") {
        UI.voltarLobby();
        return;
      }
    } catch (e) {}

    // último fallback
    showTela("tela-lobby");
  }

  function saveAfterSelect() {
    try {
      if (window.Save && typeof Save.salvar === "function") Save.salvar();
    } catch (e) {
      console.warn("[TEAM-UI] Save.salvar falhou:", e);
    }
  }

  function selectTeam(teamId) {
    // 1) tenta o fluxo oficial do main.js
    try {
      if (typeof window.selecionarTimeBasico === "function") {
        // IMPORTANTÍSSIMO: alguns mobiles travam no prompt do main.js,
        // então protegemos com try/catch: se travar/der erro, cai no fallback.
        window.selecionarTimeBasico(teamId);
        return;
      }
    } catch (e) {
      console.warn("[TEAM-UI] selecionarTimeBasico falhou, usando fallback:", e);
    }

    // 2) fallback próprio (sem prompt)
    try {
      setSelectedTeamState(teamId);

      // se existir resetGameStateForNewCareer, usa
      try {
        if (typeof window.resetGameStateForNewCareer === "function") {
          window.resetGameStateForNewCareer(teamId, Game.coachName || "Técnico");
        }
      } catch (e) {
        console.warn("[TEAM-UI] resetGameStateForNewCareer falhou:", e);
      }

      openLobbySafely();
      saveAfterSelect();
    } catch (e) {
      alert("Erro ao selecionar time: " + (e?.message || e));
      console.error(e);
    }
  }

  // -----------------------------
  // RENDER: Seleção de Time
  // -----------------------------
  async function renderTeamSelection() {
    const container = $("lista-times");
    if (!container) {
      alert("Erro: #lista-times não encontrado no index.html");
      return;
    }

    const teams = getTeamsSource();
    if (!teams.length) {
      container.innerHTML = "<p style='color:white'>Nenhum time cadastrado.</p>";
      showTela("tela-escolha-time");
      return;
    }

    container.innerHTML = "";
    showTela("tela-escolha-time");

    await detectLogoBase();

    teams.forEach((team) => {
      const card = document.createElement("button");
      card.className = "time-card";
      card.type = "button";

      const logo = createLogoImg(team.id, team.name);
      setLogoSafe(logo, team.id);

      // topo (nome curto)
      const nameTop = document.createElement("div");
      nameTop.className = "time-card-name-top";
      nameTop.textContent = team.shortName || team.name;

      // nome grande
      const nameBottom = document.createElement("div");
      nameBottom.className = "time-card-name";
      nameBottom.textContent = team.name;

      // divisão
      const div = document.createElement("div");
      div.className = "time-card-division";
      div.textContent = getDivisionLabel(team);

      card.appendChild(logo);
      card.appendChild(nameTop);
      card.appendChild(nameBottom);
      card.appendChild(div);

      // clique
      card.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        selectTeam(team.id);
      });

      container.appendChild(card);
    });
  }

  // -----------------------------
  // Elenco (mantém funcionando)
  // -----------------------------
  function obterElencoAtual() {
    const teamId =
      (window.gameState && gameState.selectedTeamId) ||
      (window.Game && Game.teamId) ||
      null;

    if (!teamId) return [];

    if (window.Database && typeof Database.carregarElencoDoTime === "function") {
      const elenco = Database.carregarElencoDoTime(teamId);
      if (Array.isArray(elenco)) return elenco;
    }

    if (window.Database && Array.isArray(Database.players)) {
      return Database.players.filter((p) => p.teamId === teamId);
    }

    return [];
  }

  function getFacePath(p) {
    if (p && p.face) return p.face;
    if (p && p.id) return `assets/face/${p.id}.png`;
    return "";
  }

  function renderSquad() {
    const container = $("elenco-lista");
    if (!container) {
      console.warn("[TEAM-UI] #elenco-lista não encontrado.");
      return;
    }

    const elenco = obterElencoAtual();
    container.innerHTML = "";

    if (!elenco.length) {
      container.innerHTML =
        "<p style='padding:10px;color:white;'>Nenhum jogador encontrado para este time.</p>";
      return;
    }

    elenco.forEach((p) => {
      const nome = p.name || p.nome || "Jogador";
      const pos = p.position || p.posicao || p.pos || p.role || "POS";
      const ovr = p.overall ?? p.ovr ?? p.rating ?? 70;

      const card = document.createElement("div");
      card.className = "card-jogador";
      card.innerHTML = `
        <img src="${getFacePath(p)}" alt="${nome}" onerror="this.style.display='none'">
        <h3>${nome}</h3>
        <p>${pos}</p>
        <p class="ovr">${ovr}</p>
      `;
      container.appendChild(card);
    });
  }

  // Exports
  window.TeamUI.renderTeamSelection = renderTeamSelection;
  window.TeamUi.renderTeamSelection = renderTeamSelection;

  window.TeamUI.renderSquad = renderSquad;
  window.TeamUi.renderSquad = renderSquad;
})();