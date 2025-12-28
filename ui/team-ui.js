/* =======================================================
   Ui/team-ui.js – Vale Futebol Manager 2026 (AAA Fix)
   - Corrige escudos quebrados (detecta caminho correto no Vercel)
   - Implementa TeamUi.renderTeamSelection (compat)
   - Implementa TeamUI.renderTeamSelection (compat)
   - Mantém TeamUI.renderSquad para Elenco
   ======================================================= */

(function () {
  "use strict";

  // Compat global (alguns lugares usam TeamUI, outros TeamUi)
  if (!window.TeamUI) window.TeamUI = {};
  if (!window.TeamUi) window.TeamUi = window.TeamUI;

  // flag para debug
  window.__TEAM_UI_REAL__ = true;

  // -----------------------------
  // Helpers
  // -----------------------------

  function $(id) {
    return document.getElementById(id);
  }

  function getDivisionLabel(team) {
    if (!team) return "Série A";
    const d = (team.division || team.serie || "A").toString().toUpperCase();
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
  // (porque Vercel/Linux é case-sensitive)
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

      // cache-buster leve para evitar cache antigo do Vercel/navegador
      const sep = url.includes("?") ? "&" : "?";
      img.src = url + sep + "v=" + Date.now();
    });
  }

  async function detectLogoBase() {
    if (__logoBaseCache) return __logoBaseCache;
    if (__logoBasePromise) return __logoBasePromise;

    __logoBasePromise = (async () => {
      // escolhe um id existente no Database.teams (ex.: FLA)
      const teams =
        (window.Database && Array.isArray(Database.teams) && Database.teams) ||
        window.teams ||
        [];

      const probeId = teams && teams.length ? teams[0].id : "FLA";

      // tenta .png e .PNG
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

      // fallback (mesmo que quebre, mantém padrão)
      __logoBaseCache = "assets/logos";
      return __logoBaseCache;
    })();

    return __logoBasePromise;
  }

  function createLogoImg(teamId, altText) {
    const img = document.createElement("img");
    img.className = "time-card-logo";
    img.alt = altText || "Escudo";
    img.loading = "lazy";

    // src inicial (será setado depois)
    img.src = "";

    return img;
  }

  async function setLogoSafe(imgEl, teamId) {
    const base = await detectLogoBase();

    // tenta .png → .PNG → some
    const try1 = `${base}/${teamId}.png`;
    const try2 = `${base}/${teamId}.PNG`;

    imgEl.src = try1;

    imgEl.onerror = function () {
      // se já tentou PNG, some
      if (imgEl.__triedPNG) {
        imgEl.style.display = "none";
        return;
      }
      imgEl.__triedPNG = true;
      imgEl.src = try2;
    };
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

    const teams =
      (window.Database && Array.isArray(Database.teams) && Database.teams) ||
      window.teams ||
      [];

    if (!teams.length) {
      container.innerHTML = "<p style='color:white'>Nenhum time cadastrado.</p>";
      showTela("tela-escolha-time");
      return;
    }

    // evita “piscar”: renderiza 1 vez só
    container.innerHTML = "";
    showTela("tela-escolha-time");

    // garante base detectado antes de montar (reduz flicker)
    await detectLogoBase();

    teams.forEach((team) => {
      const card = document.createElement("button");
      card.className = "time-card";
      card.type = "button";

      const logo = createLogoImg(team.id, team.name);
      setLogoSafe(logo, team.id);

      const nameTop = document.createElement("div");
      nameTop.className = "time-card-name-top";
      nameTop.textContent = team.shortName || team.name;

      const nameBottom = document.createElement("div");
      nameBottom.className = "time-card-name";
      nameBottom.textContent = team.name;

      const div = document.createElement("div");
      div.className = "time-card-division";
      div.textContent = getDivisionLabel(team);

      // layout (sem innerHTML pra evitar reparse e flicker)
      card.appendChild(logo);
      card.appendChild(nameTop);
      card.appendChild(nameBottom);
      card.appendChild(div);

      card.onclick = () => {
        // Preferência: usar a função do main.js (mantém toda lógica existente)
        if (typeof window.selecionarTimeBasico === "function") {
          window.selecionarTimeBasico(team.id);
          return;
        }

        // fallback mínimo (se o main mudar)
        if (!window.Game) window.Game = {};
        if (!window.gameState) window.gameState = {};

        window.Game.teamId = team.id;
        window.gameState.selectedTeamId = team.id;

        if (window.UI && typeof UI.voltarLobby === "function") UI.voltarLobby();
        else showTela("tela-lobby");
      };

      container.appendChild(card);
    });
  }

  // -----------------------------
  // Elenco (mantém funcionando)
  // -----------------------------
  function obterElencoAtual() {
    const gs = window.gameState || {};
    const teamId = gs.selectedTeamId || (window.Game && Game.teamId);

    if (!teamId) return [];

    if (window.Database && Array.isArray(Database.players)) {
      return Database.players.filter((p) => p.teamId === teamId);
    }
    return [];
  }

  function getFacePath(player) {
    // faces do seu projeto: assets/face/FLA_NOME.png etc.
    // player.face pode existir; se existir, usa.
    if (player && player.face) return player.face;

    // fallback por padrão de arquivo: TEAMID_NAME.png
    try {
      const teamId = (player.teamId || "").toString().toUpperCase();
      const nome = (player.name || "PLAYER")
        .toString()
        .replace(/\s+/g, "_")
        .replace(/[^\w\-]/g, "");
      return `assets/face/${teamId}_${nome}.png`;
    } catch (e) {
      return "";
    }
  }

  function renderSquad() {
    const container = $("elenco-lista");
    if (!container) {
      alert("Erro: #elenco-lista não encontrado no index.html");
      return;
    }

    const elenco = obterElencoAtual();
    container.innerHTML = "";

    if (!elenco.length) {
      container.innerHTML =
        "<p style='color:white'>Elenco não encontrado (time não selecionado ou database vazio).</p>";
      showTela("tela-elenco");
      return;
    }

    elenco.forEach((p) => {
      const card = document.createElement("div");
      card.className = "player-card";

      const face = document.createElement("img");
      face.src = getFacePath(p);
      face.alt = p.name || "Jogador";
      face.loading = "lazy";
      face.onerror = () => (face.style.display = "none");

      const h3 = document.createElement("h3");
      h3.textContent = p.name || "Jogador";

      const pos = document.createElement("p");
      pos.textContent = p.pos || p.position || "POS";

      const ovr = document.createElement("p");
      ovr.className = "ovr";
      ovr.textContent = (p.ovr ?? p.overall ?? "").toString();

      card.appendChild(face);
      card.appendChild(h3);
      card.appendChild(pos);
      card.appendChild(ovr);

      container.appendChild(card);
    });

    showTela("tela-elenco");
  }

  // -----------------------------
  // Export global
  // -----------------------------
  window.TeamUI.renderTeamSelection = renderTeamSelection;
  window.TeamUi.renderTeamSelection = renderTeamSelection;

  window.TeamUI.renderSquad = renderSquad;
  window.TeamUi.renderSquad = renderSquad;
})();