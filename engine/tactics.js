/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/tactics.js – Formações, escalação e substituições
   =======================================================*/

function posCombina(position, label) {
  if (!position) return false;
  position = position.toUpperCase();
  label = label.toUpperCase();

  if (label === "GOL") return position === "GOL";
  if (label === "ZAG") return ["ZAG"].includes(position);
  if (label === "LE")  return ["LE", "LTD ESQ", "ALA ESQ"].includes(position);
  if (label === "LD")  return ["LD", "LTD DIR", "ALA DIR"].includes(position);

  if (["VOL", "MC", "MEI"].includes(label)) {
    return ["VOL", "MC", "MEI"].includes(position);
  }
  if (["PE", "ME", "MD", "PD"].includes(label)) {
    return ["ME", "MD", "PE", "PD", "ALA"].includes(position);
  }
  if (["CA", "ATA"].includes(label)) {
    return ["CA", "ATA", "SA"].includes(position);
  }
  return false;
}

/* -------------------------------------------------------
   Formações – posições em %
   -------------------------------------------------------*/
const TACTIC_FORMATIONS = {
  "4-3-3": [
    { id: "GOL",  label: "GOL", x: 50, y: 88 },

    { id: "LE",   label: "LE",  x: 18, y: 72 },
    { id: "ZAG1", label: "ZAG", x: 36, y: 72 },
    { id: "ZAG2", label: "ZAG", x: 64, y: 72 },
    { id: "LD",   label: "LD",  x: 82, y: 72 },

    { id: "VOL",  label: "VOL", x: 32, y: 55 },
    { id: "MC",   label: "MC",  x: 50, y: 50 },
    { id: "MEI",  label: "MEI", x: 68, y: 55 },

    { id: "PE",   label: "PE",  x: 24, y: 34 },
    { id: "ATA",  label: "ATA", x: 50, y: 26 },
    { id: "PD",   label: "PD",  x: 76, y: 34 }
  ],

  "4-4-2": [
    { id: "GOL",  label: "GOL", x: 50, y: 88 },

    { id: "LE",   label: "LE",  x: 18, y: 72 },
    { id: "ZAG1", label: "ZAG", x: 36, y: 72 },
    { id: "ZAG2", label: "ZAG", x: 64, y: 72 },
    { id: "LD",   label: "LD",  x: 82, y: 72 },

    { id: "ME1",  label: "MEI", x: 22, y: 52 },
    { id: "VOL1", label: "VOL", x: 40, y: 52 },
    { id: "VOL2", label: "VOL", x: 60, y: 52 },
    { id: "ME2",  label: "MEI", x: 78, y: 52 },

    { id: "ATA1", label: "ATA", x: 40, y: 30 },
    { id: "ATA2", label: "ATA", x: 60, y: 30 }
  ],

  "4-2-3-1": [
    { id: "GOL",  label: "GOL", x: 50, y: 88 },

    { id: "LE",   label: "LE",  x: 18, y: 72 },
    { id: "ZAG1", label: "ZAG", x: 36, y: 72 },
    { id: "ZAG2", label: "ZAG", x: 64, y: 72 },
    { id: "LD",   label: "LD",  x: 82, y: 72 },

    { id: "VOL1", label: "VOL", x: 40, y: 58 },
    { id: "VOL2", label: "VOL", x: 60, y: 58 },

    { id: "MEI1", label: "MEI", x: 26, y: 42 },
    { id: "MEI2", label: "MEI", x: 50, y: 38 },
    { id: "MEI3", label: "MEI", x: 74, y: 42 },

    { id: "ATA",  label: "ATA", x: 50, y: 26 }
  ]
};

/* =======================================================
   Objeto principal de táticas
   =======================================================*/
window.Tactics = {
  currentFormation: "4-3-3",
  slots: [],
  elenco: [],
  benchIds: [],
  selectedBenchId: null,
  selectedSlotId: null,

  /* ---------------------------------------------------
     Abrir tela de táticas
     ---------------------------------------------------*/
  abrirTelaTaticas() {
    if (!window.Game || !Game.teamId) {
      alert("Nenhuma carreira ativa.");
      return;
    }

    // Elenco do time (objetos de jogador)
    if (!Game.elenco || !Game.elenco.length) {
      Game.elenco = Database.carregarElencoDoTime(Game.teamId);
    }
    this.elenco = Game.elenco.slice();

    // Ordena elenco por posição e OVR
    this.elenco.sort((a, b) => {
      if (a.position === b.position) return (b.overall || 0) - (a.overall || 0);
      return a.position.localeCompare(b.position);
    });

    // Formação atual
    this.currentFormation = Game.formacao || "4-3-3";

    // Ajusta selects de formação / estilo
    const selForm = document.getElementById("select-formacao");
    const selEstilo = document.getElementById("select-estilo");

    if (selForm) {
      selForm.innerHTML = "";
      Object.keys(TACTIC_FORMATIONS).forEach(f => {
        const opt = document.createElement("option");
        opt.value = f;
        opt.textContent = f;
        selForm.appendChild(opt);
      });
      selForm.value = this.currentFormation;
    }

    if (selEstilo) {
      selEstilo.value = Game.estilo || "equilibrado";
    }

    // Monta estrutura de slots
    this._montarSlotsAPartirDaFormacao();
    this._sincronizarBanco();
    this.montarCampo();

    if (typeof mostrarTela === "function") {
      mostrarTela("tela-taticas");
    }
  },

  _montarSlotsAPartirDaFormacao() {
    const baseSlots = TACTIC_FORMATIONS[this.currentFormation];
    if (!baseSlots) return;

    this.slots = baseSlots.map(s => ({ ...s, playerId: null }));

    // Reaplica escalação salva, se existir
    if (Game.titulares && Object.keys(Game.titulares).length) {
      this.slots.forEach(slot => {
        const pid = Game.titulares[slot.id];
        if (pid) slot.playerId = pid;
      });
    }

    // Se ainda não há titulares, preenche automático
    const algumTitular = this.slots.some(s => !!s.playerId);
    if (!algumTitular) {
      this.preencherAutomatico();
    }
  },

  /* ---------------------------------------------------
     Preencher automaticamente melhores jogadores
     ---------------------------------------------------*/
  preencherAutomatico() {
    const usados = new Set();
    this.slots.forEach(slot => {
      const candidatos = this.elenco
        .filter(p => posCombina(p.position, slot.label))
        .sort((a, b) => (b.overall || 0) - (a.overall || 0));

      const escolhido = candidatos.find(p => !usados.has(p.id));
      if (escolhido) {
        slot.playerId = escolhido.id;
        usados.add(escolhido.id);
      }
    });
  },

  /* ---------------------------------------------------
     Atualiza lista de reservas (banco)
     ---------------------------------------------------*/
  _sincronizarBanco() {
    const usados = new Set(this.slots.map(s => s.playerId).filter(Boolean));
    this.benchIds = this.elenco.map(p => p.id).filter(id => !usados.has(id));
  },

  /* ---------------------------------------------------
     Montar UI do campo + banco
     ---------------------------------------------------*/
  montarCampo() {
    const campo = document.getElementById("campo-tatico");
    const banco = document.getElementById("banco-reservas");
    if (!campo || !banco) return;

    campo.innerHTML = "";
    banco.innerHTML = "";

    // Campo – coloca cada slot numa posição fixa
    this.slots.forEach(slot => {
      const container = document.createElement("div");
      container.className = "posicao-jogador";
      container.style.left = slot.x + "%";
      container.style.top = slot.y + "%";
      container.dataset.slotId = slot.id;

      const card = document.createElement("div");
      card.className = "card-jogador-campo";

      const player = this.elenco.find(p => p.id === slot.playerId) || null;

      const img = document.createElement("img");
      if (player) {
        img.src = player.face || `assets/faces/${player.id}.png`;
      } else {
        img.src = "assets/faces/default.png";
      }
      img.onerror = () => { img.src = "assets/faces/default.png"; };

      const nome = document.createElement("div");
      nome.className = "nome-jogador-campo";
      if (player) {
        nome.innerHTML = `<strong>${player.name}</strong><br>${player.position} · OVR ${player.overall}`;
      } else {
        nome.innerHTML = `<strong>${slot.label}</strong><br>vago`;
      }

      card.appendChild(img);
      card.appendChild(nome);
      container.appendChild(card);

      container.addEventListener("click", () => {
        this.clicarSlot(slot.id);
      });

      // destaque se este slot está selecionado pra troca
      if (this.selectedSlotId === slot.id) {
        container.classList.add("selecionado");
      }

      campo.appendChild(container);
    });

    // Banco de reservas – cards clicáveis
    this.benchIds.forEach(pid => {
      const player = this.elenco.find(p => p.id === pid);
      if (!player) return;

      const card = document.createElement("div");
      card.className = "card-mercado card-reserva"; // reaproveita estilo bonito
      card.dataset.playerId = pid;

      const img = document.createElement("img");
      img.src = player.face || `assets/faces/${player.id}.png`;
      img.onerror = () => { img.src = "assets/faces/default.png"; };

      const infoWrapper = document.createElement("div");
      infoWrapper.innerHTML =
        `<strong>${player.name}</strong><br>` +
        `<small>${player.position} · OVR ${player.overall}</small>`;

      card.appendChild(img);
      card.appendChild(infoWrapper);

      // destaque quando selecionado
      if (this.selectedBenchId === pid) {
        card.classList.add("selecionado");
      }

      card.addEventListener("click", () => {
        this.clicarBanco(pid);
      });

      banco.appendChild(card);
    });
  },

  /* ---------------------------------------------------
     Clique no banco: escolhe quem vai entrar
     ---------------------------------------------------*/
  clicarBanco(playerId) {
    if (this.selectedBenchId === playerId) {
      // desmarcar
      this.selectedBenchId = null;
    } else {
      this.selectedBenchId = playerId;
      this.selectedSlotId = null;
    }
    this.montarCampo();
  },

  /* ---------------------------------------------------
     Clique no campo: se tiver reserva selecionada, troca
     ---------------------------------------------------*/
  clicarSlot(slotId) {
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) return;

    if (this.selectedBenchId) {
      // faz a substituição titular ↔ reserva
      this._fazerSubstituicao(slotId, this.selectedBenchId);
      return;
    }

    // Se quiser você pode habilitar seleção de slot também
    if (this.selectedSlotId === slotId) {
      this.selectedSlotId = null;
    } else {
      this.selectedSlotId = slotId;
    }
    this.montarCampo();
  },

  _fazerSubstituicao(slotId, reservaId) {
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) return;

    const antigoTitular = slot.playerId || null;
    slot.playerId = reservaId;

    // Atualiza banco
    this.benchIds = this.benchIds.filter(id => id !== reservaId);
    if (antigoTitular) {
      this.benchIds.push(antigoTitular);
    }

    this.selectedBenchId = null;
    this.selectedSlotId = null;

    this.montarCampo();
  },

  /* ---------------------------------------------------
     Salvar tática (titulares + reservas)
     ---------------------------------------------------*/
  salvarTatica() {
    const selForm = document.getElementById("select-formacao");
    const selEstilo = document.getElementById("select-estilo");

    if (selForm) Game.formacao = selForm.value || "4-3-3";
    if (selEstilo) Game.estilo = selEstilo.value || "equilibrado";

    Game.titulares = {};
    this.slots.forEach(slot => {
      if (slot.playerId) Game.titulares[slot.id] = slot.playerId;
    });

    this._sincronizarBanco();
    Game.reservas = this.benchIds.slice();
    Game.elenco = this.elenco.slice();

    salvarJogo();

    // Se estiver em meio a uma partida (ex: intervalo), volta pro jogo
    if (window.Match && Match.state && !Match.state.finished) {
      alert("Escalação salva. Voltando para o jogo!");
      if (typeof mostrarTela === "function") {
        mostrarTela("tela-partida");
      }
      if (!Match.timer && typeof Match.comecarLoop === "function") {
        Match.comecarLoop(); // retorna para o segundo tempo
      }
    } else {
      alert("Escalação e tática salvas com sucesso!");
    }
  }
};
