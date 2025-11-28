/* =======================================================
   VALE FUTEBOL MANAGER 2026
   ui/league-ui.js – Tabela de Classificação
   =======================================================*/

(function () {
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
        const teamInfo = this._buscarTime(row.teamId);
        const nomeTime = teamInfo ? teamInfo.name : (row.teamName || row.teamId);
        const saldo = (row.goalsFor || 0) - (row.goalsAgainst || 0);

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${index + 1}</td>
          <td>
            <div class="time-coluna">
              <img
                class="logo-tabela"
                src="${this._logoSrc(row.teamId)}"
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

    _buscarTime(teamId) {
      if (!teamId) return null;

      if (window.Database && Array.isArray(Database.teams)) {
        return Database.teams.find(t => t.id === teamId) || null;
      }

      if (Array.isArray(window.teams)) {
        return window.teams.find(t => t.id === teamId) || null;
      }

      return null;
    },

    _logoSrc(teamId) {
      if (!teamId) return "assets/logos/default.png";
      // Usa o mesmo padrão da pasta de logos: assets/logos/ID.png
      return `assets/logos/${teamId}.png`;
    }
  };

  window.LeagueUI = LeagueUI;

  document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("tabela-classificacao")) {
      LeagueUI.renderTabela();
    }
  });
})();
