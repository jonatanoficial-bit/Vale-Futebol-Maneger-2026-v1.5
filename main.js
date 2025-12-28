(function () {
  // Regras de robustez:
  // - Nunca assumir elemento existe sem checar
  // - Nunca quebrar boot se algum botão não existir
  // - Tudo deve renderizar a partir de um único root (#app)

  const $ = (sel) => document.querySelector(sel);

  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const c of children) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    return n;
  }

  function mount(node) {
    const root = $("#app");
    if (!root) {
      alert("Erro crítico: UI root (#app) não existe.");
      return;
    }
    root.innerHTML = "";
    root.appendChild(node);
  }

  function showCritical(err) {
    console.error(err);
    alert(`Erro crítico: ${err?.message || err}`);
  }

  // -----------------------------
  // Screens
  // -----------------------------
  function ScreenCover() {
    // Mantém “a capa atual” via assets existentes (você pode ajustar depois).
    // Baseline: tela simples com botão continuar.
    return el("div", { class: "container" }, [
      el("div", { class: "card" }, [
        el("div", { class: "h1", text: "Vale Futebol Manager 2026" }),
        el("div", { class: "p", text: "Capa (baseline). Próximo passo: escolher Pacote de Dados (DLC) e Slot." }),
        el("div", { style: "height:12px" }),
        el("button", {
          class: "btn",
          text: "CONTINUAR",
          onclick: () => goPacks(),
        }),
      ]),
    ]);
  }

  function ScreenPacks() {
    const packs = window.DataPack.listPacks();
    const s = window.State.loadState();

    const list = el("div", { class: "list" }, packs.map((p) => {
      const selected = s.selection.pack?.id === p.id;
      return el("div", { class: "item" }, [
        el("div", {}, [
          el("strong", { text: p.name }),
          el("div", { class: "small", text: `ID: ${p.id}` }),
        ]),
        el("button", {
          class: selected ? "btn secondary" : "btn blue",
          style: "width:auto; padding:10px 12px; border-radius:14px;",
          text: selected ? "SELECIONADO" : "ESCOLHER",
          onclick: async () => {
            try {
              const loaded = await window.DataPack.loadPack(p.id);
              const next = window.State.loadState();
              next.selection.pack = { id: loaded.id, name: loaded.name };
              window.State.saveState(next);
              goSlots();
            } catch (e) {
              showCritical(e);
            }
          },
        }),
      ]);
    }));

    return el("div", { class: "container" }, [
      el("div", { class: "topbar" }, [
        el("span", { class: "badge", text: "Etapa 1/2: Pacote de Dados" }),
        el("button", { class: "btn secondary", style: "width:auto; padding:10px 12px;", text: "VOLTAR", onclick: () => goCover() }),
      ]),
      el("div", { class: "card" }, [
        el("div", { class: "h1", text: "Escolha o Pacote de Dados" }),
        el("div", { class: "p", text: "Esse pacote funciona como DLC/atualização. Troca de temporada sem mexer no código." }),
        list,
      ]),
    ]);
  }

  function ScreenSlots() {
    const s = window.State.loadState();
    const pack = s.selection.pack;

    if (!pack) {
      // segurança: se o usuário caiu aqui sem escolher pack
      return el("div", { class: "container" }, [
        el("div", { class: "card" }, [
          el("div", { class: "h1", text: "Pacote não selecionado" }),
          el("div", { class: "p", text: "Volte e selecione um pacote para continuar." }),
          el("div", { style: "height:12px" }),
          el("button", { class: "btn", text: "IR PARA PACOTES", onclick: () => goPacks() }),
        ]),
      ]);
    }

    const slot1 = window.SaveSlots.readCareer(1);
    const slot2 = window.SaveSlots.readCareer(2);

    function slotCard(slotNum, career) {
      return el("div", { class: "item" }, [
        el("div", {}, [
          el("strong", { text: `Slot ${slotNum}` }),
          el("div", { class: "small", text: career ? `Carreira: ${career.profile?.name || "Sem nome"} • ${career.role}` : "Vazio" }),
        ]),
        el("div", { class: "row", style: "justify-content:flex-end; width:auto" }, [
          el("button", {
            class: "btn blue",
            style: "width:auto; padding:10px 12px; border-radius:14px;",
            text: career ? "CONTINUAR" : "INICIAR",
            onclick: () => {
              const st = window.State.loadState();
              st.selection.slot = slotNum;
              window.State.saveState(st);
              if (career) goLobby();
              else goCreateCareer();
            },
          }),
          el("button", {
            class: "btn danger",
            style: "width:auto; padding:10px 12px; border-radius:14px;",
            text: "LIMPAR",
            onclick: () => {
              window.SaveSlots.clearCareer(slotNum);
              goSlots();
            },
          }),
        ]),
      ]);
    }

    return el("div", { class: "container" }, [
      el("div", { class: "topbar" }, [
        el("span", { class: "badge", text: `Pacote: ${pack.name}` }),
        el("button", { class: "btn secondary", style: "width:auto; padding:10px 12px;", text: "VOLTAR", onclick: () => goPacks() }),
      ]),
      el("div", { class: "card" }, [
        el("div", { class: "h1", text: "Escolha o Slot de Salvamento" }),
        el("div", { class: "p", text: "Você pode ter até 2 carreiras." }),
        el("div", { class: "list" }, [
          slotCard(1, slot1),
          slotCard(2, slot2),
        ]),
      ]),
    ]);
  }

  function ScreenCreateCareer() {
    const s = window.State.loadState();
    const slot = s.selection.slot;
    const pack = s.selection.pack;

    if (!pack || !slot) {
      return el("div", { class: "container" }, [
        el("div", { class: "card" }, [
          el("div", { class: "h1", text: "Fluxo inválido" }),
          el("div", { class: "p", text: "Selecione pacote e slot antes de criar carreira." }),
          el("div", { style: "height:12px" }),
          el("button", { class: "btn", text: "IR PARA PACOTES", onclick: () => goPacks() }),
        ]),
      ]);
    }

    const nameInput = el("input", {
      placeholder: "Seu nome (ex: Jonatan)",
      style: "width:100%; padding:14px; border-radius:16px; border:1px solid rgba(255,255,255,.12); background:#0f141c; color:var(--text); outline:none;",
      value: "",
    });

    const countryInput = el("input", {
      placeholder: "País (ex: Brasil)",
      style: "width:100%; padding:14px; border-radius:16px; border:1px solid rgba(255,255,255,.12); background:#0f141c; color:var(--text); outline:none;",
      value: "Brasil",
    });

    const avatarSelect = el("select", {
      style: "width:100%; padding:14px; border-radius:16px; border:1px solid rgba(255,255,255,.12); background:#0f141c; color:var(--text); outline:none;",
    }, [
      el("option", { value: "avatar_01", text: "Avatar 01" }),
      el("option", { value: "avatar_02", text: "Avatar 02" }),
      el("option", { value: "avatar_03", text: "Avatar 03" }),
    ]);

    const roleSelect = el("select", {
      style: "width:100%; padding:14px; border-radius:16px; border:1px solid rgba(255,255,255,.12); background:#0f141c; color:var(--text); outline:none;",
    }, [
      el("option", { value: "TREINADOR", text: "Treinador" }),
      el("option", { value: "DIRETOR", text: "Diretor Esportivo" }),
      el("option", { value: "PRESIDENTE", text: "Presidente" }),
    ]);

    return el("div", { class: "container" }, [
      el("div", { class: "topbar" }, [
        el("span", { class: "badge", text: `Slot ${slot} • ${pack.name}` }),
        el("button", { class: "btn secondary", style: "width:auto; padding:10px 12px;", text: "VOLTAR", onclick: () => goSlots() }),
      ]),
      el("div", { class: "card" }, [
        el("div", { class: "h1", text: "Criar Carreira" }),
        el("div", { class: "p", text: "Escolha avatar, nome, país e o cargo da carreira." }),
        el("div", { style: "height:10px" }),
        avatarSelect,
        el("div", { style: "height:10px" }),
        nameInput,
        el("div", { style: "height:10px" }),
        countryInput,
        el("div", { style: "height:10px" }),
        roleSelect,
        el("div", { style: "height:14px" }),
        el("button", {
          class: "btn",
          text: "CONTINUAR (ESCOLHER CLUBE - em breve)",
          onclick: () => {
            const name = nameInput.value.trim();
            const country = countryInput.value.trim();
            if (!name) return alert("Digite seu nome.");
            if (!country) return alert("Digite seu país.");

            const career = {
              id: window.Utils.uid("career"),
              createdAt: Date.now(),
              packId: pack.id,
              role: roleSelect.value,
              profile: {
                avatar: avatarSelect.value,
                name,
                country,
              },
              club: null, // próxima etapa
              date: "2026-01-01",
              points: 0,
            };

            window.SaveSlots.writeCareer(slot, career);
            goLobby();
          },
        }),
      ]),
    ]);
  }

  function ScreenLobby() {
    const s = window.State.loadState();
    const slot = s.selection.slot;
    const career = slot ? window.SaveSlots.readCareer(slot) : null;

    if (!career) return ScreenSlots();

    return el("div", { class: "container" }, [
      el("div", { class: "topbar" }, [
        el("span", { class: "badge", text: `Slot ${slot} • ${career.role}` }),
        el("button", { class: "btn secondary", style: "width:auto; padding:10px 12px;", text: "SAIR", onclick: () => goCover() }),
      ]),
      el("div", { class: "card" }, [
        el("div", { class: "h1", text: "Lobby" }),
        el("div", { class: "p", text: `Jogador: ${career.profile.name} • País: ${career.profile.country}` }),
        el("div", { class: "p", text: `Data atual: ${career.date}` }),
        el("div", { style: "height:14px" }),
        el("button", { class: "btn blue", text: "CALENDÁRIO (REAL) - em breve", onclick: () => alert("Próxima entrega: calendário + próximo jogo + simulação simples.") }),
        el("div", { style: "height:10px" }),
        el("button", { class: "btn gold", text: "TÁTICAS - em breve", onclick: () => alert("Em breve.") }),
        el("div", { style: "height:10px" }),
        el("button", { class: "btn secondary", text: "MERCADO - em breve", onclick: () => alert("Em breve.") }),
        el("div", { style: "height:10px" }),
        el("button", { class: "btn", text: "SALVAR", onclick: () => alert("Salvo automaticamente no slot.") }),
      ]),
    ]);
  }

  // -----------------------------
  // Navigation
  // -----------------------------
  function goCover() { mount(ScreenCover()); }
  function goPacks() { mount(ScreenPacks()); }
  function goSlots() { mount(ScreenSlots()); }
  function goCreateCareer() { mount(ScreenCreateCareer()); }
  function goLobby() { mount(ScreenLobby()); }

  // -----------------------------
  // Boot
  // -----------------------------
  function boot() {
    // Sanity checks: engine globals
    if (!window.Utils || !window.State || !window.DataPack || !window.SaveSlots) {
      throw new Error("Engine não carregou. Verifique ordem de scripts no index.html.");
    }

    // Start
    const s = window.State.loadState();
    if (s.selection.slot) {
      const c = window.SaveSlots.readCareer(s.selection.slot);
      if (c) return goLobby();
    }
    return goCover();
  }

  // Debug button (não pode quebrar)
  function attachDebug() {
    const btn = document.createElement("button");
    btn.className = "debug";
    btn.textContent = "DEBUG";
    btn.addEventListener("click", () => {
      const st = window.State.loadState();
      alert(JSON.stringify(st, null, 2));
    });
    document.body.appendChild(btn);
  }

  window.addEventListener("load", () => {
    try {
      boot();
      attachDebug();
    } catch (e) {
      showCritical(e);
    }
  });
})();