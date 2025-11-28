/* =======================================================
   VALE FUTEBOL MANAGER 2026
   ui/league-ui.js – Tabela de Classificação
   =======================================================*/

(function () {

  // Helper para pegar o array de times do seu database.js
  function getTeamsArray() {
    if (window.Database && Array.isArray(Database.teams)) {
      return Database.teams;
    }
    try {
      if (Array.isArray(teams)) return teams; // seu const teams
    } catch (e) {}
    return [];
  }

  const LeagueUI = {

    /** Renderiza a tabela completa dentro de #tabela-classificacao */
    renderTabela() {
      const tabelaEl = document.getElementById("tabela-classificacao");
      if (!tabelaEl) {
        console.warn("[LeagueUI] Elemento #tabela-classificacao não encontrado.");
        return;
      }

      const standings = this._obterClassificacaoGenerica();
      if (!standings || !standings.length) {
        tabelaEl.innerHTML = "<tr><td>Nenhuma informação de classificação disponível.</td></tr>";
        return;
      }

      // Cabeçalho
      tabelaEl.innerHTML = `
        <thead>
          <tr>
            <th>#</th>
            <th>Time</th>
            <th>Pts</th>
            <th>J</th>
            <th>V</th>
            <th>E</th>
            <th>D</th>
            <th>GP</th>
            <th>GC</th>
            <th>SG</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = tabelaEl.querySelector("tbody");

      standings.forEach((row, index) => {
        const teamInfo = this._resolverTime(row);
        const nomeTime =
          (teamInfo && teamInfo.name) ||
          row.teamName ||
          row.team ||
          row.name ||
          row.id ||
          row.teamId ||
          "Time";

        const logoKey =
          (teamInfo && teamInfo.id) ||
          row.teamId ||
          row.team ||
          row.id ||
          nomeTime;

        const saldo = (row.goalsFor || 0) - (row.goalsAgainst || 0);

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>
            <div class="time-coluna">
              <img
                class="logo-tabela"
                src="${this._logoSrc(logoKey)}"
                alt="${nomeTime}"
                onerror="this.style.display='none'"
              >
              <span>${nomeTime}</span>
            </div>
          </td>
          <td>${row.points ?? 0}</td>
          <td>${row.played ?? 0}</td>
          <td>${row.wins ?? 0}</td>
          <td>${row.draws ?? 0}</td>
          <td>${row.losses ?? 0}</td>
          <td>${row.goalsFor ?? 0}</td>
          <td>${row.goalsAgainst ?? 0}</td>
          <td>${saldo}</td>
        `;

        tbody.appendChild(tr);
      });
    },

    // =======================
    // HELPERS
    // =======================

    _obterClassificacaoGenerica() {
      // 1) Tenta usar engine League, se existir
      if (window.League) {
        if (typeof League.getStandings === "function") {
          try {
            const arr = League.getStandings();
            if (Array.isArray(arr)) return arr;
          } catch (e) {
            console.warn("[LeagueUI] Erro em League.getStandings()", e);
          }
        }
        if (Array.isArray(League.standings)) {
          return League.standings;
        }
      }

      // 2) Tenta buscar no próprio Game
      if (window.Game) {
        if (Array.isArray(Game.standings)) return Game.standings;
        if (Array.isArray(Game.tabela))    return Game.tabela;
      }

      return [];
    },

    /** Tenta achar o time pelo ID ou pelo NOME vindo do standings */
    _resolverTime(row) {
      const arr = getTeamsArray();
      if (!arr.length) return null;

      const candidatos = [];

      if (row.teamId)   candidatos.push(val => val.id === row.teamId);
      if (row.team)     candidatos.push(val => val.id === row.team || val.name === row.team);
      if (row.id)       candidatos.push(val => val.id === row.id || val.name === row.id);
      if (row.teamName) candidatos.push(val => val.name === row.teamName);
      if (row.name)     candidatos.push(val => val.name === row.name);

      for (const cond of candidatos) {
        const achou = arr.find(cond);
        if (achou) return achou;
      }
      return null;
    },

    _logoSrc(key) {
      if (!key) return "assets/logos/default.png";

      // Se key for o ID certinho (FLA, PAL, BOT...), é só usar direto
      // Você deve ter os arquivos: assets/logos/FLA.png, PAL.png, BOT.png, etc.
      return `assets/logos/${String(key).toUpperCase()}.png`;
    }
  };

  window.LeagueUI = LeagueUI;

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("tabela-classificacao")) {
      LeagueUI.renderTabela();
    }
  });

})();
