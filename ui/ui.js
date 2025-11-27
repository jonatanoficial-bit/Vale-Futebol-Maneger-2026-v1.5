/* =======================================================
   VALE FUTEBOL MANAGER 2026
   ui/ui.js – Controle principal de interface
   =======================================================*/

window.UI = {
  // Referências de DOM
  el: {},

  /* =======================================================
     Inicialização
     =======================================================*/
  init() {
    // Telas principais
    this.el.telaCapa          = document.getElementById("tela-capa");
    this.el.telaEscolhaTime   = document.getElementById("tela-escolha-time");
    this.el.telaLobby         = document.getElementById("tela-lobby");
    this.el.telaElenco        = document.getElementById("tela-elenco");
    this.el.telaTaticas       = document.getElementById("tela-taticas");
    this.el.telaPartida       = document.getElementById("tela-partida");
    this.el.telaClassificacao = document.getElementById("tela-classificacao");
    this.el.telaResultadosRodada  = document.getElementById("tela-resultados-rodada");
    this.el.listaResultadosRodada = document.getElementById("lista-resultados-rodada");
    this.el.telaMercado       = document.getElementById("tela-mercado");

    // Elementos de listas
    this.el.listaTimes        = document.getElementById("lista-times");
    this.el.elencoLista       = document.getElementById("elenco-lista");
    this.el.tabelaClassificacao = document.getElementById("tabela-classificacao");

    // Mercado
    this.el.listaMercado      = document.getElementById("lista-mercado");
    this.el.filtroPosicao     = document.getElementById("filtro-posicao");
    this.el.filtroPremium     = document.getElementById("filtro-premium");
    this.el.filtroMaxValor    = document.getElementById("filtro-max-valor");
    this.el.filtroMinOVR      = document.getElementById("filtro-min-ovr");

    // Lobby (infos principais)
    this.el.lobbyNomeTime   = document.getElementById("lobby-nome-time");
    this.el.lobbyTemporada  = document.getElementById("lobby-temporada");
    this.el.lobbySaldo      = document.getElementById("lobby-saldo");
    this.el.lobbyLogo       = document.getElementById("lobby-logo");

    // Botões principais
    this.el.btnIniciar   = document.getElementById("btn-iniciar");
    this.el.btnContinuar = document.getElementById("btn-continuar");

    this.bindEvents();
    this.renderListaTimes();     // já deixa preparado
    this.renderClassificacao();  // tabela inicial
    this.atualizarLobby();       // se existir save, já mostra
  },

  /* =======================================================
     Eventos de UI
     =======================================================*/
  bindEvents() {
    // Botão INICIAR – abre tela de escolha de time
    if (this.el.btnIniciar) {
      this.el.btnIniciar.addEventListener("click", () => {
        if (typeof mostrarTela === "function") {
          mostrarTela("tela-escolha-time");
        }
        this.renderListaTimes();
      });
    }

    // Botão CONTINUAR – tenta carregar carreira salva
    if (this.el.btnContinuar) {
      this.el.btnContinuar.addEventListener("click", () => {
        if (typeof carregarJogoSalvo === "function") {
          const ok = carregarJogoSalvo();
          if (ok) {
            this.atualizarLobby();
            if (typeof mostrarTela === "function") {
              mostrarTela("tela-lobby");
            }
            this.renderClassificacao();
          }
        } else {
          alert("Sistema de save ainda não está disponível.");
        }
      });
    }

    // Filtros do mercado
    if (this.el.filtroPosicao) {
      this.el.filtroPosicao.addEventListener("change", () => this.aplicarFiltrosMercado());
    }
    if (this.el.filtroPremium) {
      this.el.filtroPremium.addEventListener("change", () => this.aplicarFiltrosMercado());
    }
    if (this.el.filtroMaxValor) {
      this.el.filtroMaxValor.addEventListener("input", () => this.aplicarFiltrosMercado());
    }
    if (this.el.filtroMinOVR) {
      this.el.filtroMinOVR.addEventListener("input", () => this.aplicarFiltrosMercado());
    }
  },

  /* =======================================================
     Navegação básica
     =======================================================*/
  voltarParaCapa() {
    if (typeof mostrarTela === "function") {
      mostrarTela("tela-capa");
    }
  },

  voltarLobby() {
    this.atualizarLobby();
    this.renderClassificacao();
    if (typeof mostrarTela === "function") {
      mostrarTela("tela-lobby");
    }
  },

  abrirProximoJogo() {
    if (!window.Match || typeof Match.iniciarProximoJogo !== "function") {
      alert("Engine de partida ainda não foi carregada.");
      return;
    }
    Match.iniciarProximoJogo();
    if (typeof mostrarTela === "function") {
      mostrarTela("tela-partida");
    }
  },

  abrirClassificacao() {
    this.renderClassificacao();
    if (typeof mostrarTela === "function") {
      mostrarTela("tela-classificacao");
    }
  },

  abrirElenco() {
    this.renderElenco();
    if (typeof mostrarTela === "function") {
      mostrarTela("tela-elenco");
    }
  },

  abrirMercado() {
    if (!window.Market || typeof Market.init !== "function") {
      alert("Módulo de mercado não carregado.");
      return;
    }
    Market.init();
    this.renderMercado();
    if (typeof mostrarTela === "function") {
      mostrarTela("tela-mercado");
    }
  },

  abrirTaticas() {
    if (window.Tactics && typeof Tactics.abrirTelaTaticas === "function") {
      Tactics.abrirTelaTaticas();
    } else if (typeof mostrarTela === "function") {
      mostrarTela("tela-taticas");
    }
  },

  /* =======================================================
     Lobby
     =======================================================*/
  atualizarLobby() {
    if (!window.Game || !window.Database || !Database.getTeamById) return;
    if (!Game.teamId) return;

    const team = Database.getTeamById(Game.teamId);
    if (!team) return;

    const season = Game.seasonYear || Game.temporada || 2026;
    const saldo  = (typeof Game.saldo === "number")
      ? Game.saldo
      : (typeof Game.balance === "number" ? Game.balance : 0);

    if (this.el.lobbyNomeTime) {
      this.el.lobbyNomeTime.textContent = team.name;
    }
    if (this.el.lobbyTemporada) {
      this.el.lobbyTemporada.textContent = `Temporada: ${season}`;
    }
    if (this.el.lobbySaldo) {
      this.el.lobbySaldo.textContent = `Saldo: ${saldo.toFixed(1)} mi`;
    }
    if (this.el.lobbyLogo) {
      this.el.lobbyLogo.src = `assets/logos/${team.id}.png`;
      this.el.lobbyLogo.alt = team.name;
      this.el.lobbyLogo.onerror = () => {
        this.el.lobbyLogo.src = "assets/logos/default.png";
      };
    }
  },

  /* =======================================================
     Lista de times (nova carreira)
     =======================================================*/
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
    if (typeof novaCarreira === "function") {
      novaCarreira(teamId);
    } else if (typeof selecionarTimeBasico === "function") {
      // fallback da engine antiga
      selecionarTimeBasico(teamId);
    } else {
      Game.teamId = teamId;
      Game.saldo = Game.saldo || 50;
    }

    this.atualizarLobby();
    if (typeof mostrarTela === "function") {
      mostrarTela("tela-lobby");
    }
  },

  /* =======================================================
     Elenco
     =======================================================*/
  renderElenco() {
    if (!this.el.elencoLista) return;
    this.el.elencoLista.innerHTML = "";

    if (!window.Game) return;

    let elenco = Game.elenco;
    if ((!elenco || !elenco.length) && window.Database && Database.players && Game.teamId) {
      elenco = Database.players.filter(p => p.teamId === Game.teamId);
    }

    if (!elenco || !elenco.length) {
      this.el.elencoLista.innerHTML = "<p>Elenco não disponível.</p>";
      return;
    }

    elenco.forEach(p => {
      const item = document.createElement("div");
      item.className = "item-elenco";

      const foto = document.createElement("img");
      foto.src = p.face || `assets/faces/${p.id}.png`;
      foto.alt = p.name;
      foto.onerror = () => {
        foto.src = "assets/faces/default.png";
      };

      const info = document.createElement("div");
      info.className = "info-elenco";
      info.innerHTML =
        `<strong>${p.name}</strong><br>` +
        `<span>${p.position} – OVR ${p.overall}</span>`;

      item.appendChild(foto);
      item.appendChild(info);

      this.el.elencoLista.appendChild(item);
    });
  },

  /* =======================================================
     Classificação (tabela da liga)
     =======================================================*/
  renderClassificacao() {
    if (!this.el.tabelaClassificacao) return;
    const table = this.el.tabelaClassificacao;
    table.innerHTML = "";

    // Cabeçalho
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["#", "Time", "Pts", "J", "V", "E", "D", "GP", "GC", "SG"].forEach(h => {
      const th = document.createElement("th");
      th.textContent = h;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const tbody = document.createElement("tbody");

    if (window.League && typeof League.getClassificacaoArray === "function") {
      const standings = League.getClassificacaoArray();

      standings.forEach((row, idx) => {
        const tr = document.createElement("tr");

        // Posição
        const tdPos = document.createElement("td");
        tdPos.textContent = idx + 1;
        tr.appendChild(tdPos);

        // Time (escudo + nome)
        const tdTime = document.createElement("td");
        const wrap = document.createElement("div");
        wrap.className = "time-coluna";

        const team = Database.getTeamById(row.teamId);

        const img = document.createElement("img");
        img.className = "logo-tabela";
        img.src = team ? `assets/logos/${team.id}.png` : "assets/logos/default.png";
        img.onerror = () => { img.src = "assets/logos/default.png"; };

        const span = document.createElement("span");
        span.textContent = team ? (team.shortName || team.name) : row.teamId;

        wrap.appendChild(img);
        wrap.appendChild(span);
        tdTime.appendChild(wrap);
        tr.appendChild(tdTime);

        const cols = [
          row.points,
          row.played,
          row.wins,
          row.draws,
          row.losses,
          row.goalsFor,
          row.goalsAgainst,
          (row.goalsFor - row.goalsAgainst)
        ];

        cols.forEach(c => {
          const td = document.createElement("td");
          td.textContent = c;
          tr.appendChild(td);
        });

        tbody.appendChild(tr);
      });
    } else if (window.Database && Database.teams) {
      // Fallback: tabela zerada com logos
      const serieA = Database.teams.filter(t => t.division === "A");
      serieA.forEach((team, idx) => {
        const tr = document.createElement("tr");

        const tdPos = document.createElement("td");
        tdPos.textContent = idx + 1;
        tr.appendChild(tdPos);

        const tdTime = document.createElement("td");
        const wrap = document.createElement("div");
        wrap.className = "time-coluna";

        const img = document.createElement("img");
        img.className = "logo-tabela";
        img.src = `assets/logos/${team.id}.png`;
        img.onerror = () => { img.src = "assets/logos/default.png"; };

        const span = document.createElement("span");
        span.textContent = team.shortName || team.name;

        wrap.appendChild(img);
        wrap.appendChild(span);
        tdTime.appendChild(wrap);
        tr.appendChild(tdTime);

        const cols = [
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
  },

  /* =======================================================
     Resultados da rodada
     =======================================================*/
  mostrarResultadosRodada(rodada) {
    if (!rodada || !this.el.listaResultadosRodada) {
      this.voltarLobby();
      return;
    }

    const container = this.el.listaResultadosRodada;
    container.innerHTML = "";

    const titulo = document.getElementById("titulo-rodada");
    if (titulo) {
      titulo.textContent = `RESULTADOS DA RODADA ${rodada.numero}`;
    }

    rodada.jogos.forEach(j => {
      const linha = document.createElement("div");
      linha.className = "linha-resultado";

      const home = Database.getTeamById(j.homeTeamId);
      const away = Database.getTeamById(j.awayTeamId);

      const nomeHome = home ? (home.shortName || home.name) : j.homeTeamId;
      const nomeAway = away ? (away.shortName || away.name) : j.awayTeamId;

      linha.textContent = `${nomeHome}  ${j.homeGoals} x ${j.awayGoals}  ${nomeAway}`;
      container.appendChild(linha);
    });

    // Atualiza tabela com os novos pontos
    this.renderClassificacao();

    if (typeof mostrarTela === "function") {
      mostrarTela("tela-resultados-rodada");
    }
  },

  /* =======================================================
     Mercado – filtros e renderização
     =======================================================*/
  aplicarFiltrosMercado() {
    if (!window.Market || typeof Market.definirFiltros !== "function") return;

    Market.definirFiltros({
      posicao: this.el.filtroPosicao ? this.el.filtroPosicao.value : "ALL",
      premium: this.el.filtroPremium ? this.el.filtroPremium.checked : false,
      maxValor: this.el.filtroMaxValor ? this.el.filtroMaxValor.value : null,
      minOVR: this.el.filtroMinOVR ? this.el.filtroMinOVR.value : 0
    });

    this.renderMercado();
  },

  renderMercado() {
    if (!this.el.listaMercado || !window.Market || typeof Market.getListaFiltrada !== "function") return;

    const container = this.el.listaMercado;
    container.innerHTML = "";

    const lista = Market.getListaFiltrada();
    if (!lista.length) {
      container.innerHTML = "<p style='padding:8px 16px;'>Nenhum jogador encontrado com esses filtros.</p>";
      return;
    }

    lista.forEach(j => {
      const card = document.createElement("div");
      card.className = "card-mercado";

      const img = document.createElement("img");
      img.src = j.face || `assets/faces/${j.id}.png`;
      img.onerror = () => { img.src = "assets/faces/default.png"; };
      card.appendChild(img);

      const infoWrapper = document.createElement("div");
      const team = (window.Database && typeof Database.getTeamById === "function")
        ? Database.getTeamById(j.teamId)
        : null;
      const teamName = team ? (team.shortName || team.name) : j.teamId;

      infoWrapper.innerHTML =
        `<strong>${j.name}</strong><br>` +
        `<small>${j.position} – ${teamName}</small>`;
      card.appendChild(infoWrapper);

      const ovr = document.createElement("div");
      ovr.className = "ovr";
      ovr.textContent = `OVR ${j.overall}`;
      card.appendChild(ovr);

      const valor = document.createElement("div");
      valor.className = "valor";
      valor.textContent = `€ ${j.value.toFixed(1)} mi`;
      card.appendChild(valor);

      const btn = document.createElement("button");
      btn.className = "btn-green";
      btn.textContent = "COMPRAR";
      btn.addEventListener("click", () => {
        if (!window.Market || typeof Market.comprarJogador !== "function") {
          alert("Sistema de mercado ainda não está pronto.");
          return;
        }
        const ok = Market.comprarJogador(j.id);
        if (ok) {
          this.atualizarLobby();
          this.renderMercado();
        }
      });
      card.appendChild(btn);

      container.appendChild(card);
    });
  }
};
