/* =======================================================
   VALE FUTEBOL MANAGER 2026
   ui/ui.js – Controle de telas e lobby
   =======================================================*/

window.UI = {
  // Flag usada para saber se a tela de táticas foi aberta no intervalo
  modoIntervalo: false,

  /* ========================
     FUNÇÃO GENÉRICA DE TELAS
     ========================*/
  mostrarTela(idTela) {
    const telas = document.querySelectorAll(".tela");
    telas.forEach(t => t.classList.remove("ativa"));

    const alvo = document.getElementById(idTela);
    if (alvo) alvo.classList.add("ativa");
  },

  /* Exposta globalmente caso outros arquivos chamem mostrarTela(...) */
  ensureGlobalMostrarTela() {
    if (typeof window.mostrarTela !== "function") {
      window.mostrarTela = (id) => UI.mostrarTela(id);
    }
  },

  /* ========================
     CAPA / LOBBY
     ========================*/
  voltarParaCapa() {
    this.modoIntervalo = false;
    this.mostrarTela("tela-capa");
  },

  // Chamado depois que o usuário escolhe o time (MenuUI normalmente cuida disso)
  abrirLobby() {
    this.atualizarLobby();
    this.mostrarTela("tela-lobby");
  },

  voltarLobby() {
    this.modoIntervalo = false;
    this.atualizarLobby();
    this.mostrarTela("tela-lobby");
  },

  atualizarLobby() {
    if (!window.Game || !Game.teamId || !window.Database) return;

    const time = Database.getTeamById(Game.teamId);
    if (!time) return;

    const logoEl = document.getElementById("lobby-logo");
    const nomeEl = document.getElementById("lobby-nome-time");
    const temporadaEl = document.getElementById("lobby-temporada");
    const saldoEl = document.getElementById("lobby-saldo");

    if (logoEl) {
      logoEl.src = `assets/logos/${time.id}.png`;
      logoEl.alt = time.name;
    }
    if (nomeEl) nomeEl.textContent = time.name;

    const ano =
      (Game.league && Game.league.seasonYear) ||
      Game.seasonYear ||
      2025;
    if (temporadaEl) temporadaEl.textContent = `Temporada: ${ano}`;

    const saldo = Game.saldo != null ? Game.saldo : 50;
    if (saldoEl) saldoEl.textContent = `Saldo: ${saldo.toFixed(1)} mi`;
  },

  /* ========================
     BOTÃO: PRÓXIMO JOGO
     ========================*/
  abrirProximoJogo() {
    if (window.Match && typeof Match.iniciarProximoJogo === "function") {
      Match.iniciarProximoJogo();
    } else {
      alert("Engine de partida ainda não foi carregada.");
    }
  },

  /* ========================
     BOTÃO: TABELA
     ========================*/
  abrirClassificacao() {
    if (window.League && typeof League.ensureState === "function") {
      League.ensureState();
    }
    if (window.LeagueUI && typeof LeagueUI.preencherTabela === "function") {
      LeagueUI.preencherTabela();
    }
    this.mostrarTela("tela-classificacao");
  },

  /* ========================
     BOTÃO: ELENCO
     ========================*/
  abrirElenco() {
    // Normalmente quem popula o elenco é outro arquivo (tactics-ui ou menu-ui)
    if (window.TacticsUI && typeof TacticsUI.preencherElenco === "function") {
      TacticsUI.preencherElenco();
    }
    this.mostrarTela("tela-elenco");
  },

  /* ========================
     BOTÃO: MERCADO
     ========================*/
  abrirMercado() {
    if (window.MarketUI && typeof MarketUI.inicializar === "function") {
      MarketUI.inicializar(); // se você criou essa função
    } else if (window.MarketUI && typeof MarketUI.aplicarFiltros === "function") {
      // fallback: tenta só aplicar filtros padrão
      MarketUI.aplicarFiltros();
    }
    this.mostrarTela("tela-mercado");
  },

  /* ========================
     BOTÃO: TÁTICAS
     ========================*/
  abrirTaticas() {
    this.mostrarTela("tela-taticas");

    // Mostra ou esconde o botão "Voltar ao jogo" dependendo se veio do intervalo
    const btnVoltarJogo = document.getElementById("btn-voltar-jogo");
    if (btnVoltarJogo) {
      btnVoltarJogo.style.display = this.modoIntervalo
        ? "inline-block"
        : "none";
    }

    // Se existir um módulo de UI de táticas, manda renderizar o campo/banco
    if (window.TacticsUI && typeof TacticsUI.renderTela === "function") {
      TacticsUI.renderTela();
    }
  },

  /* Chamado pelo botão "Voltar ao jogo" na tela de táticas */
  voltarParaPartida() {
    this.modoIntervalo = false;
    this.mostrarTela("tela-partida");

    if (window.Match && typeof Match.retomarAposIntervalo === "function") {
      Match.retomarAposIntervalo();
    }
  },

  /* ========================
     INIT
     ========================*/
  init() {
    this.ensureGlobalMostrarTela();

    // Se existir sistema de save, carrega
    if (typeof carregarJogo === "function") {
      try {
        carregarJogo();
      } catch (e) {
        console.warn("Erro ao carregar save:", e);
      }
    }

    // Começa na capa
    this.mostrarTela("tela-capa");
  }
};

/* Garante que, se alguém chamar mostrarTela('id'), vai usar o UI */
UI.ensureGlobalMostrarTela();

/* Inicializa assim que o DOM estiver pronto */
document.addEventListener("DOMContentLoaded", () => {
  if (window.UI && typeof UI.init === "function") {
    UI.init();
  }
});
