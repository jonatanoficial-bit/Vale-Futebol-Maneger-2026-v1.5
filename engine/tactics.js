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
    { id: "CA",  label: "CA",  x: 50, y: 25 },
    { id: "PD",  label: "PD",  x: 80, y: 30 }
  ],

  "4-4-2": [
    { id: "GOL", label: "GOL", x: 50, y: 90 },
    { id: "LE",  label: "LE",  x: 20, y: 75 },
    { id: "ZAG1",label: "ZAG", x: 40, y: 75 },
    { id: "ZAG2",label: "ZAG", x: 60, y: 75 },
    { id: "LD",  label: "LD",  x: 80, y: 75 },

    { id: "ME",  label: "ME",  x: 20, y: 55 },
    { id: "VOL", label: "VOL", x: 40, y: 55 },
    { id: "MC",  label: "MC",  x: 60, y: 55 },
    { id: "MD",  label: "MD",  x: 80, y: 55 },

    { id: "ATA1",label: "ATA", x: 40, y: 30 },
    { id: "ATA2",label: "ATA", x: 60, y: 30 }
  ],

  "4-2-3-1": [
    { id: "GOL", label: "GOL", x: 50, y: 90 },
    { id: "LE",  label: "LE",  x: 20, y: 75 },
    { id: "ZAG1",label: "ZAG", x: 40, y: 75 },
    { id: "ZAG2",label: "ZAG", x: 60, y: 75 },
    { id: "LD",  label: "LD",  x: 80, y: 75 },

    { id: "VOL1",label: "VOL", x: 40, y: 60 },
    { id: "VOL2",label: "VOL", x: 60, y: 60 },

    { id: "MEI1",label: "MEI", x: 30, y: 45 },
    { id: "MEI2",label: "MEI", x: 50, y: 42 },
    { id: "MEI3",label: "MEI", x: 70, y: 45 },

    { id: "ATA", label: "ATA", x: 50, y: 28 }
  ]
};

function posCombina(position, label) {
  if (!position) return false;
  position = position.toUpperCase();
  label = label.toUpperCase();

  // mapeamento bem simplificado
  if (label === "GOL") return position === "GOL";
  if (label === "ZAG") return ["ZAG"].includes(position);
  if (label === "LE")  return ["LE","LTD","LTD ESQ"].includes(position);
  if (label === "LD")  return ["LD","LTD DIR"].includes(position);
  if (["VOL","MC","MEI"].includes(label)) {
    return ["VOL","MC","MEI"].includes(position);
  }
  if (["PE","MD","ME","PD"].includes(label)) {
    return ["ME","MD","PE","PD","ALA"].includes(position);
  }
  if (["CA","ATA"].includes(label)) {
    return ["CA","ATA","SA"].includes(position);
  }
  return false;
}

window.Tactics = {
  currentFormation: "4-3-3",
  slots: [],   // {id,label,x,y,playerId}
  elenco: [],

  abrirTelaTaticas() {
    // carrega elenco
    if (!Game.elenco || !Game.elenco.length) {
      Game.elenco = carregarElencoDoTime(Game.teamId);
    }
    this.elenco = Game.elenco.slice();

    // formação atual
    this.currentFormation = Game.formacao || "4-3-3";

    // selects
    const selForm = document.getElementById("select-formacao");
    const selEstilo = document.getElementById("select-estilo");
    if (selForm) {
      selForm.innerHTML = "";
      Object.keys(TACTIC_FORMATIONS).forEach(fid => {
        const opt = document.createElement("option");
        opt.value = fid;
        opt.textContent = fid;
        if (fid === this.currentFormation) opt.selected = true;
        selForm.appendChild(opt);
      });
      selForm.onchange = () => {
        this.currentFormation = selForm.value;
        this.montarCampo();
      };
    }
    if (selEstilo) {
      selEstilo.value = Game.estilo || "equilibrado";
    }

    this.montarCampo();
    mostrarTela("tela-taticas");
  },

  montarCampo() {
    const campo = document.getElementById("campo-tatico");
    const banco = document.getElementById("banco-reservas");
    if (!campo || !banco) return;

    campo.innerHTML = "";
    banco.innerHTML = "";

    const baseSlots = TACTIC_FORMATIONS[this.currentFormation];
    if (!baseSlots) return;

    // monta slots (clona)
    this.slots = baseSlots.map(s => ({ ...s, playerId: null }));

    // se já existir escalação salva, tenta reaplicar
    if (Game.titulares && Object.keys(Game.titulares).length) {
      this.slots.forEach(slot => {
        const pid = Game.titulares[slot.id];
        if (pid) slot.playerId = pid;
      });
    }

    // se não tinha nada salvo, distribui melhores jogadores por posição
    if (!Game.titulares || !Object.keys(Game.titulares).length) {
      this.preencherAutomatico();
    }

    // renderizar no campo
    this.slots.forEach(slot => {
      const card = document.createElement("div");
      card.className = "posicao-jogador";
      card.style.left = slot.x + "%";
      card.style.top  = slot.y + "%";

      const player = this.elenco.find(p => p.id === slot.playerId);

      const img = document.createElement("img");
      if (player) {
        img.src = player.face || `assets/faces/${player.id}.png`;
      } else {
        img.src = "assets/faces/default.png";
      }
      img.onerror = () => { img.src = "assets/faces/default.png"; };

      const nome = document.createElement("div");
      nome.style.fontSize = "12px";
      nome.style.marginTop = "4px";
      nome.textContent = player ? player.name : slot.label;

      card.appendChild(img);
      card.appendChild(nome);

      // clique para alternar jogador
      card.addEventListener("click", () => {
        this.cicloJogador(slot.id);
      });

      campo.appendChild(card);
    });

    // banco = todos que não estão em slots
    const usados = new Set(this.slots.map(s => s.playerId).filter(Boolean));
    const reservas = this.elenco.filter(p => !usados.has(p.id));

    reservas.forEach(p => {
      const item = document.createElement("div");
      item.className = "card-jogador";
      const img = document.createElement("img");
      img.src = p.face || `assets/faces/${p.id}.png`;
      img.onerror = () => { img.src = "assets/faces/default.png"; };

      const nome = document.createElement("div");
      nome.textContent = p.name;
      const pos = document.createElement("div");
      pos.textContent = p.position || "";
      const ovr = document.createElement("div");
      ovr.className = "ovr";
      ovr.textContent = p.overall || 70;

      item.appendChild(img);
      item.appendChild(nome);
      item.appendChild(pos);
      item.appendChild(ovr);
      banco.appendChild(item);
    });
  },

  preencherAutomatico() {
    // pega 11 melhores por compatibilidade com cada slot
    const usados = new Set();
    this.slots.forEach(slot => {
      const candidatos = this.elenco
        .filter(p => posCombina(p.position, slot.label) && !usados.has(p.id))
        .sort((a, b) => (b.overall || 70) - (a.overall || 70));
      let escolhido = candidatos[0];
      if (!escolhido) {
        // pega melhor jogador genérico ainda não usado
        const outros = this.elenco
          .filter(p => !usados.has(p.id))
          .sort((a, b) => (b.overall || 70) - (a.overall || 70));
        escolhido = outros[0];
      }
      if (escolhido) {
        slot.playerId = escolhido.id;
        usados.add(escolhido.id);
      }
    });
  },

  cicloJogador(slotId) {
    const slot = this.slots.find(s => s.id === slotId);
    if (!slot) return;

    const usados = new Set(this.slots.map(s => s.playerId).filter(Boolean));
    usados.delete(slot.playerId); // libera o atual

    const candidatos = this.elenco
      .filter(p => !usados.has(p.id))
      .sort((a, b) => (b.overall || 70) - (a.overall || 70));

    if (!candidatos.length) return;

    // pega o próximo da lista
    const idxAtual = candidatos.findIndex(p => p.id === slot.playerId);
    let novo;
    if (idxAtual === -1 || idxAtual === candidatos.length - 1) {
      novo = candidatos[0];
    } else {
      novo = candidatos[idxAtual + 1];
    }

    slot.playerId = novo.id;
    this.montarCampo(); // re-render
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
