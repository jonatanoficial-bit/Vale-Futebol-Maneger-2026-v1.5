/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/market.js – Mercado de transferências
   =======================================================*/

window.Market = {
  lista: [],
  filtros: {
    posicao: "ALL",
    premium: false,
    maxValor: null,
    minOVR: 0
  },

  init() {
    if (!window.Database || !Database.players || !window.Game) return;
    const meuTime = Game.teamId;
    // Por enquanto: só jogadores de outros clubes
    this.lista = Database.players.filter(p => p.teamId !== meuTime);
  },

  getListaFiltrada() {
    let arr = [...this.lista];

    if (this.filtros.posicao && this.filtros.posicao !== "ALL") {
      arr = arr.filter(p => p.position === this.filtros.posicao);
    }

    if (this.filtros.minOVR) {
      arr = arr.filter(p => p.overall >= this.filtros.minOVR);
    }

    if (this.filtros.maxValor != null) {
      arr = arr.filter(p => p.value <= this.filtros.maxValor);
    }

    if (this.filtros.premium) {
      // "Pacote premium": só os craques (OVR ≥ 82, top 30)
      arr.sort((a, b) => b.overall - a.overall);
      arr = arr.filter(p => p.overall >= 82).slice(0, 30);
    } else {
      arr.sort((a, b) => b.overall - a.overall);
    }

    return arr;
  },

  definirFiltros({ posicao, premium, maxValor, minOVR }) {
    if (posicao !== undefined) this.filtros.posicao = posicao;
    if (premium !== undefined) this.filtros.premium = premium;
    if (maxValor !== undefined) {
      this.filtros.maxValor = maxValor === "" ? null : Number(maxValor);
    }
    if (minOVR !== undefined) {
      this.filtros.minOVR = Number(minOVR) || 0;
    }
  },

  comprarJogador(playerId) {
    if (!window.Game) {
      alert("Jogo não inicializado.");
      return false;
    }
    const jogador = this.lista.find(p => p.id === playerId);
    if (!jogador) {
      alert("Jogador não encontrado no mercado.");
      return false;
    }

    const preco = jogador.value || 1;

    // Garante saldo inicial
    if (Game.saldo == null) Game.saldo = 50; // 50 mi se não tiver nada

    if (Game.saldo < preco) {
      alert("Saldo insuficiente para esta transferência.");
      return false;
    }

    const confirmMsg =
      `Confirmar compra de ${jogador.name} por € ${preco.toFixed(1)} mi?\n` +
      `Seu saldo atual: € ${Game.saldo.toFixed(1)} mi.`;
    if (!confirm(confirmMsg)) return false;

    // Debita saldo
    Game.saldo -= preco;

    // Atualiza vínculo do jogador
    jogador.teamId = Game.teamId;

    // Atualiza elenco do Game
    if (!Array.isArray(Game.elenco)) Game.elenco = [];
    const jaTem = Game.elenco.find(p => p.id === jogador.id);
    if (!jaTem) {
      Game.elenco.push(jogador);
    }

    if (typeof salvarJogo === "function") {
      salvarJogo();
    }

    const team = Database.getTeamById(Game.teamId);
    alert(`Transferência concluída!\n${jogador.name} agora faz parte do ${team ? team.name : "seu time"}.`);

    // Recarrega o mercado sem o jogador comprado
    this.init();
    return true;
  }
};
