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

    this.el.listaTimes = document.getElementById("lista-times");
    this.el.elencoLista = document.getElementById("elenco-lista");
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
        // Nova carreira
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
    // Próximas fases: aqui vamos chamar a engine de partida
    alert("Sistema de partida será ativado na próxima etapa (simulação + narração).");
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
    // Futuro: tela de transferências
    alert("Tela de mercado/transferências será ativada nas próximas etapas.");
  },

  abrirTaticas() {
    // Futuro: tela visual de táticas
    alert("Tela tática com campo e escalação será ativada na próxima fase.");
    // mostrarTela("tela-taticas");
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
      card.className = "card-time";

      const logo = document.createElement("img");
      logo.src = `assets/logos/${team.id}.png`;
      logo.alt = team.name;
      logo.onerror = () => {
        logo.src = "assets/logos/default.png";
      };

      const nome = document.createElement("div");
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
    if (nomeTime) nomeTime.textContent = team.name;
    if (temporada) temporada.textContent = `Temporada: ${Game.seasonYear || 2026}`;
    if (saldo) saldo.textContent = `Saldo: € ${Game.saldo.toFixed(1)} mi`;
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
      img.src = p.face || `assets/faces/${p.id}.png`;
      img.onerror = () => {
        img.src = "assets/faces/default.png";
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
  // CLASSIFICAÇÃO (placeholder)
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

    Database.teams
      .filter(t => t.division === "A")
      .forEach((team, idx) => {
        const tr = document.createElement("tr");
        const cols = [
          idx + 1,
          team.name,
          0, 0, 0, 0, 0, 0, 0, 0
        ];
        cols.forEach(c => {
          const td = document.createElement("td");
          td.textContent = c;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

    table.appendChild(thead);
    table.appendChild(tbody);
  }
};
