/* =======================================================
   VALE FUTEBOL MANAGER 2026
   engine/tactics.js – Formações e escalação
   =======================================================*/

const TACTIC_FORMATIONS = {
  "4-3-3": [
    { id: "GOL", label: "GOL", x: 50, y: 90 },
    { id: "LE",  label: "LE",  x: 20, y: 75 },
    { id: "ZAG1",label: "ZAG", x: 40, y: 75 },
    { id: "ZAG2",label: "ZAG", x: 60, y: 75 },
    { id: "LD",  label: "LD",  x: 80, y: 75 },

    { id: "VOL", label: "VOL", x: 35, y: 55 },
    { id: "MC",  label: "MC",  x: 50, y: 50 },
    { id: "MEI", label: "MEI", x: 65, y: 55 },

    { id: "PE",  label: "PE",  x: 20, y: 30 },
    { id: "PD",  label: "PD",  x: 80, y: 30 },
    { id: "ATA", label: "ATA", x: 50, y: 25 }
  ],

  "4-4-2": [
    { id: "GOL", label: "GOL", x: 50, y: 90 },
    { id: "LE",  label: "LE",  x: 20, y: 75 },
    { id: "ZAG1",label: "ZAG", x: 40, y: 75 },
    { id: "ZAG2",label: "ZAG", x: 60, y: 75 },
    { id: "LD",  label: "LD",  x: 80, y: 75 },

    { id: "VOL1",label: "VOL", x: 30, y: 55 },
    { id: "VOL2",label: "VOL", x: 70, y: 55 },
    { id: "MEI1",label: "MEI", x: 35, y: 40 },
    { id: "MEI2",label: "MEI", x: 65, y: 40 },

    { id: "ATA1",label: "ATA", x: 40, y: 25 },
    { id: "ATA2",label: "ATA", x: 60, y: 25 }
  ],

  "4-2-3-1": [
    { id: "GOL", label: "GOL", x: 50, y: 90 },
    { id: "LE",  label: "LE",  x: 20, y: 75 },
    { id: "ZAG1",label: "ZAG", x: 40, y: 75 },
    { id: "ZAG2",label: "ZAG", x: 60, y: 75 },
    { id: "LD",  label: "LD",  x: 80, y: 75 },

    { id: "VOL1",label: "VOL", x: 35, y: 60 },
    { id: "VOL2",label: "VOL", x: 65, y: 60 },

    { id: "MEI_C",label: "MEI", x: 50, y: 45 },
    { id: "PE",   label: "PE",  x: 25, y: 40 },
    { id: "PD",   label: "PD",  x: 75, y: 40 },

    { id: "ATA",  label: "ATA", x: 50, y: 25 }
  ]
};

// =======================================================
// OBJETO TACTICS
// =======================================================

window.Tactics = {
  elenco: [],
  slots: [],
  formacaoAtual: "4-3-3",

  abrirTelaTaticas() {
    if (!window.Game || !Game.teamId) {
      alert("Nenhum time selecionado.");
      return;
    }

    this.carregarElenco();
    this.configurarFormacoes();
    this.montarCampo();
    this.montarBanco();

    mostrarTela("tela-taticas");
  },

  // Carrega elenco do time atual
  carregarElenco() {
    if (!window.Database || !Database.players) {
      this.elenco = [];
      return;
    }
    this.elenco = Database.players
      .filter(p => p.teamId === Game.teamId)
      .sort((a, b) => (b.overall || 0) - (a.overall || 0));
  },

  // Configura selects de formação e estilo
  configurarFormacoes() {
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

      selForm.value = Game.formacao || "4-3-3";
      this.formacaoAtual = selForm.value;

      selForm.onchange = () => {
        this.formacaoAtual = selForm.value;
        this.montarCampo();
      };
    }

    if (selEstilo) {
      selEstilo.value = Game.estilo || "equilibrado";
      selEstilo.onchange = () => {
        Game.estilo = selEstilo.value;
        salvarJogo();
      };
    }

    const baseSlots = TACTIC_FORMATIONS[this.formacaoAtual] || [];
    this.slots = baseSlots.map(s => ({ ...s, playerId: null }));

    if (Game.titulares && Object.keys(Game.titulares).length) {
      this.slots.forEach(slot => {
        const pid = Game.titulares[slot.id];
        if (pid) slot.playerId = pid;
      });
    }

    if (!Game.titulares || !Object.keys(Game.titulares).length) {
      this.preencherAutomatico();
    }
  },

  // Distribui automaticamente os melhores por posição
  preencherAutomatico() {
    const usados = new Set();
    const porPos = {};

    this.elenco.forEach(p => {
      if (!porPos[p.position]) porPos[p.position] = [];
      porPos[p.position].push(p);
    });

    Object.keys(porPos).forEach(pos => {
      porPos[pos].sort((a, b) => (b.overall || 0) - (a.overall || 0));
    });

    this.slots.forEach(slot => {
      const label = slot.label;
      let candidatos = [];
      if (label === "ZAG") {
        candidatos = (porPos["ZAG"] || []).concat(porPos["ZC"] || []);
      } else if (label === "LE") {
        candidatos = porPos["LE"] || [];
      } else if (label === "LD") {
        candidatos = porPos["LD"] || [];
      } else if (label === "VOL") {
        candidatos = porPos["VOL"] || [];
      } else if (label === "MC" || label === "MEI") {
        candidatos = (porPos["MEI"] || []).concat(porPos["MC"] || []);
      } else if (label === "PE") {
        candidatos = (porPos["PE"] || []).concat(porPos["ATA"] || []);
      } else if (label === "PD") {
        candidatos = (porPos["PD"] || []).concat(porPos["ATA"] || []);
      } else if (label === "ATA") {
        candidatos = porPos["ATA"] || [];
      } else if (label === "GOL") {
        candidatos = porPos["GOL"] || [];
      }

      candidatos = candidatos.filter(p => !usados.has(p.id));

      if (candidatos.length) {
        const escolhido = candidatos[0];
        slot.playerId = escolhido.id;
        usados.add(escolhido.id);
      }
    });
  },

  // Monta o campo tático
  montarCampo() {
    const campo = document.getElementById("campo-tatico");
    if (!campo) return;

    campo.innerHTML = "";

    const baseSlots = TACTIC_FORMATIONS[this.formacaoAtual] || [];
    if (!this.slots.length || this.slots.length !== baseSlots.length) {
      this.slots = baseSlots.map(s => ({ ...s, playerId: null }));
    }

    this.slots.forEach(slot => {
      const wrap = document.createElement("div");
      wrap.className = "slot-jogador";
      wrap.style.left = slot.x + "%";
      wrap.style.top  = slot.y + "%";

      const player = this.elenco.find(p => p.id === slot.playerId);

      const card = document.createElement("div");
      card.className = "slot-card";

      const img = document.createElement("img");
      if (player) {
        img.src = player.face || `assets/face/${player.id}.png`;
      } else {
        img.src = "assets/face/default.png";
      }
      img.onerror = () => { img.src = "assets/face/default.png"; };

      const nome = document.createElement("div");
      nome.style.fontSize = "12px";
      nome.style.marginTop = "4px";
      nome.textContent = player ? player.name : slot.label;

      const info = document.createElement("div");
      info.style.fontSize = "10px";
      if (player) {
        info.textContent = `${player.position} · OVR ${player.overall}`;
      } else {
        info.textContent = "vago";
      }

      card.appendChild(img);
      card.appendChild(nome);
      card.appendChild(info);

      card.onclick = () => {
        this.ciclarJogadorNoSlot(slot.id);
      };

      wrap.appendChild(card);
      campo.appendChild(wrap);
    });
  },

  // Monta o banco de reservas
  montarBanco() {
    const banco = document.getElementById("banco-reservas");
    if (!banco) return;

    banco.innerHTML = "";

    const usados = new Set(this.slots.map(s => s.playerId).filter(Boolean));
    const reservas = this.elenco.filter(p => !usados.has(p.id));

    reservas.forEach(p => {
      const card = document.createElement("div");
      card.className = "reserva-card";

      const img = document.createElement("img");
      img.src = p.face || `assets/face/${p.id}.png`;
      img.onerror = () => { img.src = "assets/face/default.png"; };

      const nome = document.createElement("div");
      nome.textContent = p.name;

      const info = document.createElement("div");
      info.textContent = `${p.position} · OVR ${p.overall}`;

      card.appendChild(img);
      card.appendChild(nome);
      card.appendChild(info);

      card.onclick = () => {
        this.substituirPorReserva(p.id);
      };

      banco.appendChild(card);
    });
  },

  // Substitui jogador do campo por um reserva (clicando no reserva)
  substituirPorReserva(idReserva) {
    const reserva = this.elenco.find(p => p.id === idReserva);
    if (!reserva) return;

    const slotAlvoIndex = this.slots.findIndex(s => {
      const p = this.elenco.find(x => x.id === s.playerId);
      return p && p.position === reserva.position;
    });

    if (slotAlvoIndex === -1) {
      alert("Não há posição compatível para esse jogador na formação atual.");
      return;
    }

    const slot = this.slots[slotAlvoIndex];
    const idTitularAntigo = slot.playerId;
    slot.playerId = reserva.id;

    const usados = new Set(this.slots.map(s => s.playerId).filter(Boolean));
    const reservas = this.elenco.filter(p => !usados.has(p.id));

    Game.titulares = {};
    this.slots.forEach(s => {
      if (s.playerId) Game.titulares[s.id] = s.playerId;
    });
    Game.reservas = reservas.map(p => p.id);

    this.montarCampo();
    this.montarBanco();
  },

  // Clicar em um slot do campo troca o titular dentro do elenco da mesma posição
  ciclarJogadorNoSlot(slotId) {
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) return;

    const candidatos = this.elenco.filter(p => {
      if (slot.label === "ZAG") return p.position === "ZAG" || p.position === "ZC";
      if (slot.label === "LE")  return p.position === "LE";
      if (slot.label === "LD")  return p.position === "LD";
      if (slot.label === "VOL") return p.position === "VOL";
      if (slot.label === "MC" || slot.label === "MEI") return p.position === "MEI" || p.position === "MC";
      if (slot.label === "PE")  return p.position === "PE"  || p.position === "ATA";
      if (slot.label === "PD")  return p.position === "PD"  || p.position === "ATA";
      if (slot.label === "ATA") return p.position === "ATA";
      if (slot.label === "GOL") return p.position === "GOL";
      return true;
    });

    if (!candidatos.length) return;

    const idxAtual = candidatos.findIndex(p => p.id === slot.playerId);
    let novo;
    if (idxAtual === -1 || idxAtual === candidatos.length - 1) {
      novo = candidatos[0];
    } else {
      novo = candidatos[idxAtual + 1];
    }

    slot.playerId = novo.id;
    this.montarCampo();
  },

  salvarTatica() {
    const selForm = document.getElementById("select-formacao");
    const selEstilo = document.getElementById("select-estilo");

    if (selForm) Game.formacao = selForm.value || "4-3-3";
    if (selEstilo) Game.estilo = selEstilo.value || "equilibrado";

    Game.titulares = {};
    this.slots.forEach(slot => {
      if (slot.playerId) {
        Game.titulares[slot.id] = slot.playerId;
      }
    });

    const usados = new Set(Object.values(Game.titulares));
    Game.reservas = this.elenco.filter(p => !usados.has(p.id)).map(p => p.id);

    salvarJogo();
    alert("Escalação e tática salvas com sucesso!");
  }
};
