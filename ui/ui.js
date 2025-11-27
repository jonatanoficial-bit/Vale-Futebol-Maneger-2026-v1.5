/* =======================================================
   VALE FUTEBOL MANAGER 2026
   ui/ui.js – Controle principal de interface
   =======================================================*/

window.UI = {
  // Referências de DOM
  el: {},

  init() {
    // Cache dos elementos
    this.el.telaCapa          = document.getElementById("tela-capa");
    this.el.telaEscolhaTime   = document.getElementById("tela-escolha-time");
    this.el.telaLobby         = document.getElementById("tela-lobby");
    this.el.telaElenco        = document.getElementById("tela-elenco");
    this.el.telaTaticas       = document.getElementById("tela-taticas");
    this.el.telaPartida       = document.getElementById("tela-partida");
    this.el.telaClassificacao = document.getElementById("tela-classificacao");
    this.el.telaResultados    = document.getElementById("tela-resultados-rodada");
    this.el.telaMercado       = document.getElementById("tela-mercado");

    this.el.listaTimes        = document.getElementById("lista-times");
    this.el.elencoLista       = document.getElementById("elenco-lista");
    this.el.tabelaClassificacao = document.getElementById("tabela-classificacao");

    this.el.btnIniciar   = document.getElementById("btn-iniciar");
    this.el.btnContinuar = document.getElementById("btn-continuar");

    // Liga eventos
    this.bindEvents();

    // Se houver save, entra direto no lobby
    const temSave = carregarJogo();
    if (temSave && Game.teamId) {
      this.atualizarLobby();
      mostrarTela("tela-lobby");
    } else {
      mostrarTela("tela-capa");
    }

    // Prepara lista de times para escolha
    this.renderListaTimes();
  },

  bindEvents() {
    if (this.el.btnIniciar) {
      this.el.btnIniciar.addEventListener("click", () => {
        deletarCarreira();
        mostrarTela("tela-escolha-time");
      });
    }

    if (this.el.btnContinuar) {
      this.el.btnContinuar.addEventListener("click", () => {
        const ok = carregarJogo();
        if (ok && Game.teamId) {
          this.atualizarLobby();
          mostrarTela("tela-lobby");
        } else {
          alert("Nenhuma carreira salva encontrada.");
        }
      });
    }
  },

  // ------------------------------------------
  // TELAS
  // ------------------------------------------

  voltarParaCapa() {
    mostrarTela("tela-capa");
  },

  voltarLobby() {
    this.atualizarLobby();
    mostrarTela("tela-lobby");
  },

  abrirProximoJogo() {
    if (!window.Match) {
      alert("Módulo de partida não carregado.");
      return;
    }
    Match.iniciarProximoJogo();
  },

  abrirClassificacao() {
    this.renderClassificacao();
    mostrarTela("tela-classificacao");
  },

  abrirElenco() {
    this.renderElenco();
    mostrarTela("tela-elenco");
  },

  abrirMercado() {
    // Abre a tela de mercado de transferências
    if (window.Market && typeof Market.abrir === "function") {
      Market.abrir();
    }
    mostrarTela("tela-mercado");
  },

  abrirTaticas() {
    if (!window.Tactics) {
      alert("Módulo de táticas não carregado.");
      return;
    }
    Tactics.abrirTelaTaticas();
  },

  // ------------------------------------------
  // LISTA DE TIMES (ESCOLHA)
  // ------------------------------------------
  renderListaTimes() {
    if (!this.el.listaTimes) return;
    this.el.listaTimes.innerHTML = "";

    if (!window.Database || !Database.teams) return;

    Database.teams.forEach(team => {
      const card = document.createElement("div");
      card.className = "time-card";

      const logo = document.createElement("img");
      logo.className = "time-logo";
      logo.src = `assets/logos/${team.id}.png`;
      logo.onerror = () => {
        logo.src = "assets/logos/default.png";
      };

      const nome = document.createElement("div");
      nome.className = "time-nome";
      nome.textContent = team.name;

      card.appendChild(logo);
      card.appendChild(nome);

      card.addEventListener("click", () => {
        this.selecionarTime(team.id);
      });

      this.el.listaTimes.appendChild(card);
    });
  },

  selecionarTime(teamId) {
    novaCarreira(teamId);
    this.atualizarLobby();
    mostrarTela("tela-lobby");
  },

  // ------------------------------------------
  // LOBBY
  // ------------------------------------------
  atualizarLobby() {
    const logo = document.getElementById("lobby-logo");
    const nomeTime = document.getElementById("lobby-nome-time");
    const temporada = document.getElementById("lobby-temporada");
    const saldo = document.getElementById("lobby-saldo");

    if (!Database || !Database.getTeamById) return;
    const team = Database.getTeamById(Game.teamId);
    if (!team) return;

    if (logo) {
      logo.src = `assets/logos/${team.id}.png`;
      logo.onerror = () => { logo.src = "assets/logos/default.png"; };
    }
    if (nomeTime) {
      nomeTime.textContent = team.name;
    }
    if (temporada) {
      temporada.textContent = `Temporada: ${Game.temporada || 2026}`;
    }
    if (saldo) {
      const valor = Game.saldo != null ? Game.saldo : 50;
      saldo.textContent = `Saldo: ${valor.toFixed(1)} mi`;
    }
  },

  // ------------------------------------------
  // ELENCO
  // ------------------------------------------
  renderElenco() {
    if (!this.el.elencoLista) return;
    this.el.elencoLista.innerHTML = "";

    const elenco = carregarElencoDoTime(Game.teamId);
    Game.elenco = elenco;

    elenco.forEach(p => {
      const card = document.createElement("div");
      card.className = "card-jogador";

      const img = document.createElement("img");
      img.src = p.face || `assets/face/${p.id}.png`;
      img.onerror = () => {
        img.src = "assets/face/default.png";
      };

      const nome = document.createElement("div");
      nome.textContent = p.name;

      const pos = document.createElement("div");
      pos.textContent = p.position || "";

      const ovr = document.createElement("div");
      ovr.className = "ovr";
      ovr.textContent = p.overall || 70;

      card.appendChild(img);
      card.appendChild(nome);
      card.appendChild(pos);
      card.appendChild(ovr);

      this.el.elencoLista.appendChild(card);
    });
  },

  // ------------------------------------------
  // CLASSIFICAÇÃO (placeholder simples)
  // ------------------------------------------
  renderClassificacao() {
    if (!this.el.tabelaClassificacao) return;
    const table = this.el.tabelaClassificacao;
    table.innerHTML = "";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["#", "Time", "Pts", "J", "V", "E", "D", "GP", "GC", "SG"].forEach(h => {
      const th = document.createElement("th");
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const tbody = document.createElement("tbody");

    if (window.League && typeof League.getTabela === "function") {
      const tabela = League.getTabela();
      tabela.forEach((row, idx) => {
        const tr = document.createElement("tr");

        const cols = [
          idx + 1,
          row.nomeTime,
          row.pontos,
          row.jogos,
          row.vitorias,
          row.empates,
          row.derrotas,
          row.golsPro,
          row.golsContra,
          row.saldoGols
        ];
        cols.forEach(c => {
          const td = document.createElement("td");
          td.textContent = c;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    } else {
      // placeholder se League ainda não estiver pronto
      (Database.teams || []).forEach((t, idx) => {
        const tr = document.createElement("tr");
        const cols = [
          idx + 1,
          t.name,
          0, 0, 0, 0, 0, 0, 0, 0
        ];
        cols.forEach(c => {
          const td = document.createElement("td");
          td.textContent = c;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }

    table.appendChild(thead);
    table.appendChild(tbody);
  }
};
