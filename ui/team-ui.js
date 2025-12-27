/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/team-ui.js — Elenco AAA (Status Fitness + Contrato)
   -------------------------------------------------------
   Entrega:
   - Tela de seleção de time (capa -> escolha)
   - Tela de elenco com badges:
     • LESIONADO (X sem.)
     • SUSPENSO
     • FADIGA (xx%)
   - (Opcional) mostra salário e meses de contrato, se Contracts estiver disponível
   - Botão "Treino" já existe no Lobby; aqui é apenas ELENCO
   =======================================================*/

(function () {
  console.log("%c[TeamUI] team-ui.js carregado", "color:#38bdf8; font-weight:bold;");

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function el(tag, cls, txt) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (txt != null) d.textContent = txt;
    return d;
  }
  function clear(node) { if (!node) return; while (node.firstChild) node.removeChild(node.firstChild); }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }
  function getPlayers() {
    return (window.Database && Array.isArray(Database.players)) ? Database.players : [];
  }
  function getTeamById(id) { return getTeams().find(t => String(t.id) === String(id)) || null; }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    return window.gameState;
  }

  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  // Fitness API (resistente a ausência)
  function fitnessOf(pid) {
    try { if (window.Fitness && typeof Fitness.ensurePlayer === "function") return Fitness.ensurePlayer(pid); } catch (e) {}
    // fallback neutro
    return { fatigue: 10, injuryWeeks: 0, suspended: false, yellowCards: 0 };
  }
  function isAvailable(pid) {
    try { if (window.Fitness && typeof Fitness.isAvailable === "function") return Fitness.isAvailable(pid); } catch (e) {}
    return true;
  }

  // Contracts (opcional)
  function getPlayerContract(pid) {
    try { if (window.Contracts && typeof Contracts.getContractForPlayer === "function") return Contracts.getContractForPlayer(pid); } catch (e) {}
    return null;
  }

  // -----------------------------
  // SELEÇÃO DE TIME (Tela 2)
  // -----------------------------
  function renderTeamSelection() {
    const wrap = document.getElementById("lista-times");
    clear(wrap);

    const teams = getTeams().slice();
    // destaque dos principais (ex.: Série A primeiro)
    teams.sort((a, b) => {
      const da = String(a.division || a.serie || "A");
      const db = String(b.division || b.serie || "A");
      if (da !== db) return da.localeCompare(db);
      return String(a.name || a.id).localeCompare(String(b.name || b.id));
    });

    teams.forEach(team => {
      const card = el("div", "time-card");
      const logo = el("img", "time-logo");
      logo.src = `assets/logos/${team.id}.png`;
      logo.alt = team.name;
      logo.onerror = () => { logo.src = "assets/logos/default.png"; };

      const name = el("div", "time-name", team.name);
      const serie = el("div", "time-serie", `Série ${team.division || team.serie || "A"}`);

      const pickBtn = el("button", "btn-green", "ESCOLHER");
      pickBtn.onclick = () => {
        const gs = ensureGS();
        gs.selectedTeamId = team.id;
        gs.currentTeamId = team.id;
        if (window.Game) Game.teamId = team.id;

        // inicializa arranjos táticos mínimos
        if (!gs.formacao) gs.formacao = "4-4-2";
        if (!Array.isArray(gs.titulares)) gs.titulares = [];

        try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}
        try { if (window.UI && typeof UI.voltarLobby === "function") { UI.voltarLobby(); return; } } catch (e) {}
        // fallback
        alert(`Time selecionado: ${team.name}`);
      };

      card.appendChild(logo);
      card.appendChild(name);
      card.appendChild(serie);
      card.appendChild(pickBtn);
      wrap.appendChild(card);
    });
  }

  // -----------------------------
  // ELENCO (Tela 6)
  // -----------------------------
  function renderTeamSquad() {
    const teamId = getUserTeamId();
    const team = getTeamById(teamId);
    const list = document.getElementById("lista-elenco");
    clear(list);

    if (!team) {
      list.appendChild(el("div", "mini-muted", "Nenhum time selecionado."));
      return;
    }

    // Título
    const header = el("div", "elenco-header");
    const hTitle = el("h2", "elenco-title", team.name);
    const hSerie = el("div", "elenco-serie", `Série ${team.division || team.serie || "A"}`);
    header.appendChild(hTitle);
    header.appendChild(hSerie);
    list.appendChild(header);

    // Tabela
    const table = el("div", "elenco-table");
    const head = el("div", "elenco-row elenco-head");
    ["#", "Jogador", "Pos", "OVR", "Status", "Contrato"].forEach(t => head.appendChild(el("div", "cell", t)));
    table.appendChild(head);

    const players = getPlayers().filter(p => String(p.teamId) === String(teamId));
    if (!players.length) {
      table.appendChild(el("div", "mini-muted", "Elenco vazio."));
    } else {
      // ordena por pos -> ovr
      players.sort((a, b) => {
        const pa = String(a.pos || a.position || "");
        const pb = String(b.pos || b.position || "");
        if (pa !== pb) return pa.localeCompare(pb);
        return n(b.ovr ?? b.overall, 0) - n(a.ovr ?? a.overall, 0);
      });

      players.forEach((p, idx) => {
        const row = el("div", "elenco-row");

        // #
        row.appendChild(el("div", "cell cell-idx", String(idx + 1)));

        // Jogador (com face, se existir)
        const cellJ = el("div", "cell cell-jogador");
        const face = el("img", "face");
        face.src = `assets/faces/${p.id}.png`;
        face.alt = p.name || p.nome || ("#" + p.id);
        face.onerror = () => { face.src = "assets/faces/default.png"; };
        const nm = el("div", "nome", p.name || p.nome || ("Jogador " + p.id));
        cellJ.appendChild(face);
        cellJ.appendChild(nm);
        row.appendChild(cellJ);

        // Pos
        row.appendChild(el("div", "cell cell-pos", String(p.pos || p.position || "—")));

        // OVR
        row.appendChild(el("div", "cell cell-ovr", String(n(p.ovr ?? p.overall, 0))));

        // Status Fitness
        const f = fitnessOf(p.id);
        const statusCell = el("div", "cell cell-status");
        const badges = [];

        if (f.injuryWeeks > 0) {
          const b = el("span", "badge badge-injury", `LESIONADO (${f.injuryWeeks} sem.)`);
          badges.push(b);
        }
        if (f.suspended) {
          const b = el("span", "badge badge-susp", "SUSPENSO");
          badges.push(b);
        }

        // fadiga
        const fatiguePct = n(f.fatigue, 0);
        const fd = el("span", "badge badge-fatigue", `FADIGA ${fatiguePct}%`);
        if (fatiguePct >= 80) fd.classList.add("badge-red");
        else if (fatiguePct >= 60) fd.classList.add("badge-amber");
        badges.push(fd);

        if (!badges.length) badges.push(el("span", "badge badge-ok", "OK"));
        badges.forEach(b => statusCell.appendChild(b));
        row.appendChild(statusCell);

        // Contrato (opcional)
        const cCell = el("div", "cell cell-contrato");
        const c = getPlayerContract(p.id);
        if (c) {
          // esperado (se existir): { wageMi, monthsLeft }
          const wage = typeof c.wageMi === "number" ? c.wageMi.toFixed(2) : (c.wageMi || "—");
          const months = (c.monthsLeft != null) ? String(c.monthsLeft) : "—";
          cCell.textContent = `R$ ${wage} mi/mês • ${months} m`;
        } else {
          cCell.textContent = "—";
        }
        row.appendChild(cCell);

        table.appendChild(row);
      });
    }

    list.appendChild(table);

    // Ação
    const actions = el("div", "elenco-actions");
    const btnTaticas = el("button", "btn-blue", "ABRIR TÁTICAS");
    btnTaticas.onclick = () => { if (window.UI && typeof UI.abrirTaticas === "function") UI.abrirTaticas(); };
    actions.appendChild(btnTaticas);

    const btnLobby = el("button", "btn-green", "VOLTAR AO LOBBY");
    btnLobby.onclick = () => { if (window.UI && typeof UI.voltarLobby === "function") UI.voltarLobby(); };
    actions.appendChild(btnLobby);

    list.appendChild(actions);
  }

  // Expor API
  window.TeamUI = {
    renderTeamSelection,
    renderTeamSquad
  };
})();