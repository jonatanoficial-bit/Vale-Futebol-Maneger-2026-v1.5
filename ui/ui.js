(() => {
  const NS = (window.VFM26 = window.VFM26 || {});
  NS.bootStep?.("Carregando UI...");

  const UI = {
    mount: null,
    screen: "home",
    error: null,

    data: {
      catalog: null,
      packId: null,
      slotId: "1",
      career: null
    },

    start() {
      this.mount = document.getElementById("app");
      NS.bootAssert?.(this.mount, "DOM não está pronto.", "Elemento #app não encontrado.", "BOOT_E01_DOM_NOT_READY");

      NS.bootAssert?.(NS.Engine, "Engine não registrada", "window.VFM26.Engine não existe.", "BOOT_E03_ENGINE_NOT_REGISTERED");

      this.render();
    },

    nav(screen) {
      this.screen = screen;
      this.error = null;
      this.render();
    },

    setError(msg) {
      this.error = msg;
      this.render();
    },

    async goHome() {
      this.nav("home");
    },

    async goDataPack() {
      this.nav("datapack");
      try {
        const catalog = await NS.Engine.loadCatalog();
        this.data.catalog = catalog;
        this.render();
      } catch (e) {
        this.setError("Falha ao carregar catálogo de packs: " + (e?.message || e));
      }
    },

    async selectPack(packId) {
      try {
        this.data.packId = packId;
        await NS.Engine.loadPack(packId);
        this.nav("saves");
      } catch (e) {
        this.setError("Falha ao carregar pack: " + (e?.message || e));
      }
    },

    selectSlot(slotId) {
      this.data.slotId = String(slotId);
      const slot = NS.Engine.getSlot(this.data.slotId);

      if (!slot) {
        // cria slot vazio já apontando pro pack
        const created = NS.Engine.createNewSlot(this.data.slotId, this.data.packId || "brasil");
        NS.bootStep?.("Slot criado", created);
      }

      this.nav("career");
    },

    deleteSlot(slotId) {
      NS.Engine.deleteSlot(String(slotId));
      this.render();
    },

    saveCareer(careerObj) {
      this.data.career = careerObj;
      NS.Engine.saveCareer(this.data.slotId, careerObj);
      this.nav("lobby");
    },

    render() {
      if (!this.mount) return;
      this.mount.innerHTML = "";

      const wrap = document.createElement("div");
      wrap.className = "vfm-wrap";

      const card = document.createElement("div");
      card.className = "vfm-card";

      const inner = document.createElement("div");
      inner.className = "vfm-card-inner";

      inner.appendChild(this.renderScreen());
      if (this.error) inner.appendChild(renderError(this.error));

      card.appendChild(inner);
      wrap.appendChild(card);
      this.mount.appendChild(wrap);
    },

    renderScreen() {
      switch (this.screen) {
        case "home":
          return renderHome(this);
        case "datapack":
          return renderDataPack(this);
        case "saves":
          return renderSaves(this);
        case "career":
          return renderCareer(this);
        case "lobby":
          return renderLobby(this);
        default:
          return renderHome(this);
      }
    }
  };

  function renderHome(ui) {
    const root = document.createElement("div");

    const h = document.createElement("h1");
    h.className = "vfm-title";
    h.textContent = "VALE FUTEBOL MANAGER 2026";

    const p = document.createElement("p");
    p.className = "vfm-sub";
    p.textContent = "Simulador de futebol manager. Base sólida pronta. Agora: DataPack e Saves.";

    const sec = document.createElement("div");
    sec.className = "vfm-section";

    const tag = document.createElement("div");
    tag.className = "vfm-pill";
    tag.textContent = `Engine v${NS.Engine?.version || "?"}`;

    const h3 = document.createElement("h3");
    h3.textContent = "MODO CARREIRA";

    const info = document.createElement("div");
    info.className = "vfm-small";
    info.textContent = "Fluxo obrigatório: DataPack → Save Slot → Carreira.";

    const row = document.createElement("div");
    row.className = "vfm-row";

    const btn = document.createElement("button");
    btn.className = "vfm-btn vfm-btn-primary";
    btn.textContent = "INICIAR";
    btn.onclick = () => ui.goDataPack();

    sec.appendChild(h3);
    sec.appendChild(document.createElement("div")).appendChild(tag);
    sec.appendChild(info);
    row.appendChild(btn);
    sec.appendChild(document.createElement("div")).appendChild(row);

    root.appendChild(h);
    root.appendChild(p);
    root.appendChild(sec);
    return root;
  }

  function renderDataPack(ui) {
    const root = document.createElement("div");

    const h = document.createElement("h1");
    h.className = "vfm-title";
    h.textContent = "Escolher DataPack";

    const p = document.createElement("p");
    p.className = "vfm-sub";
    p.textContent = "Sem mexer no código do jogo: os packs são arquivos JSON em /packs.";

    const sec = document.createElement("div");
    sec.className = "vfm-section";

    const list = document.createElement("div");
    list.className = "vfm-list";

    const packs = ui.data.catalog?.packs || [];
    if (!packs.length) {
      const empty = document.createElement("div");
      empty.className = "vfm-item";
      empty.innerHTML = `<strong>Nenhum pack encontrado em packs/catalog.json</strong>
        <div class="vfm-small">Se isso apareceu, o catálogo não carregou ou está vazio.</div>`;
      list.appendChild(empty);
    } else {
      packs.forEach((pack) => {
        const item = document.createElement("div");
        item.className = "vfm-item";

        const title = document.createElement("strong");
        title.textContent = pack.name || pack.id;

        const meta = document.createElement("div");
        meta.className = "vfm-small";
        meta.textContent = `ID: ${pack.id}  Região: ${pack.region || "?"}  Arquivo: ${pack.file}`;

        const desc = document.createElement("div");
        desc.className = "vfm-small";
        desc.style.marginTop = "6px";
        desc.textContent = pack.description || "";

        const row = document.createElement("div");
        row.className = "vfm-row";
        row.style.marginTop = "10px";

        const btn = document.createElement("button");
        btn.className = "vfm-btn vfm-btn-primary";
        btn.textContent = "SELECIONAR";
        btn.onclick = () => ui.selectPack(pack.id);

        row.appendChild(btn);
        item.appendChild(title);
        item.appendChild(meta);
        item.appendChild(desc);
        item.appendChild(row);
        list.appendChild(item);
      });
    }

    const rowBottom = document.createElement("div");
    rowBottom.className = "vfm-row";
    rowBottom.style.marginTop = "14px";

    const back = document.createElement("button");
    back.className = "vfm-btn vfm-btn-ghost";
    back.textContent = "VOLTAR";
    back.onclick = () => ui.goHome();

    rowBottom.appendChild(back);

    sec.appendChild(list);

    root.appendChild(h);
    root.appendChild(p);
    root.appendChild(sec);
    root.appendChild(rowBottom);
    return root;
  }

  function renderSaves(ui) {
    const root = document.createElement("div");

    const h = document.createElement("h1");
    h.className = "vfm-title";
    h.textContent = "Escolher Save Slot";

    const p = document.createElement("p");
    p.className = "vfm-sub";
    p.textContent = `DataPack ativo: ${ui.data.packId || "—"}`;

    const sec = document.createElement("div");
    sec.className = "vfm-section";

    const list = document.createElement("div");
    list.className = "vfm-list";

    ["1", "2"].forEach((slotId) => {
      const slot = NS.Engine.getSlot(slotId);

      const item = document.createElement("div");
      item.className = "vfm-item";

      const title = document.createElement("strong");
      title.textContent = `SLOT ${slotId} — ${slot?.career ? "Continuar" : "Começar novo jogo"}`;

      const meta = document.createElement("div");
      meta.className = "vfm-small";
      meta.textContent = slot
        ? `Pack atual: ${slot.packId} | Atualizado: ${new Date(slot.updatedAt).toLocaleString()}`
        : `Slot vazio. Pack atual: ${ui.data.packId || "—"}`;

      const row = document.createElement("div");
      row.className = "vfm-row";
      row.style.marginTop = "10px";

      const create = document.createElement("button");
      create.className = "vfm-btn vfm-btn-primary";
      create.textContent = slot?.career ? "CONTINUAR" : "CRIAR NOVO";
      create.onclick = () => ui.selectSlot(slotId);

      const del = document.createElement("button");
      del.className = "vfm-btn vfm-btn-danger";
      del.textContent = "APAGAR";
      del.onclick = () => ui.deleteSlot(slotId);

      row.appendChild(create);
      row.appendChild(del);

      item.appendChild(title);
      item.appendChild(meta);
      item.appendChild(row);
      list.appendChild(item);
    });

    const rowBottom = document.createElement("div");
    rowBottom.className = "vfm-row";
    rowBottom.style.marginTop = "14px";

    const back = document.createElement("button");
    back.className = "vfm-btn vfm-btn-ghost";
    back.textContent = "VOLTAR";
    back.onclick = () => ui.goDataPack();

    rowBottom.appendChild(back);

    sec.appendChild(list);

    root.appendChild(h);
    root.appendChild(p);
    root.appendChild(sec);
    root.appendChild(rowBottom);
    return root;
  }

  function renderCareer(ui) {
    const root = document.createElement("div");

    const h = document.createElement("h1");
    h.className = "vfm-title";
    h.textContent = "Criar Carreira";

    const p = document.createElement("p");
    p.className = "vfm-sub";
    p.textContent = `Slot: ${ui.data.slotId} | Pack: ${ui.data.packId || "—"}`;

    const sec = document.createElement("div");
    sec.className = "vfm-section";

    // Campos
    const form = document.createElement("div");
    form.className = "vfm-list";

    const name = inputRow("Nome do Manager", "text", "Ex: Jonatan Vale");
    const country = inputRow("País", "text", "Brasil");
    const role = selectRow("Cargo", [
      { v: "coach", t: "Treinador" },
      { v: "sporting", t: "Diretor Esportivo" },
      { v: "president", t: "Presidente" }
    ]);

    // Clubes do pack
    const clubs = NS.Engine.getClubsFromPack();
    const clubOptions = clubs.map((c) => ({
      v: c.id,
      t: `${c.name} (${c.league === "A" ? "Série A" : c.league === "B" ? "Série B" : c.league})`
    }));

    const club = selectRow("Clube", clubOptions.length ? clubOptions : [{ v: "", t: "Nenhum clube no pack" }]);

    form.appendChild(name.wrap);
    form.appendChild(country.wrap);
    form.appendChild(role.wrap);
    form.appendChild(club.wrap);

    const row = document.createElement("div");
    row.className = "vfm-row";
    row.style.marginTop = "12px";

    const back = document.createElement("button");
    back.className = "vfm-btn vfm-btn-ghost";
    back.textContent = "VOLTAR";
    back.onclick = () => ui.nav("saves");

    const cont = document.createElement("button");
    cont.className = "vfm-btn vfm-btn-primary";
    cont.textContent = "CONTINUAR";
    cont.onclick = () => {
      const clubId = club.select.value;
      const found = clubs.find((c) => c.id === clubId);
      const careerObj = {
        name: name.input.value.trim() || "Manager",
        country: country.input.value.trim() || "Brasil",
        role: role.select.value,
        club: found
          ? { id: found.id, name: found.name, crest: found.crest, league: found.league, state: found.state }
          : null,
        createdAt: Date.now()
      };
      ui.saveCareer(careerObj);
    };

    row.appendChild(back);
    row.appendChild(cont);

    sec.appendChild(form);
    root.appendChild(h);
    root.appendChild(p);
    root.appendChild(sec);
    root.appendChild(row);
    return root;
  }

  function renderLobby(ui) {
    const root = document.createElement("div");

    const h = document.createElement("h1");
    h.className = "vfm-title";
    h.textContent = "Lobby";

    const career = ui.data.career || NS.Engine.getSlot(ui.data.slotId)?.career || null;
    const preview = NS.GameCore?.buildMatchPreview(career) || { title: "Lobby", subtitle: "", tips: [] };

    const p = document.createElement("p");
    p.className = "vfm-sub";
    p.textContent = preview.subtitle || "";

    const sec = document.createElement("div");
    sec.className = "vfm-section";

    const header = document.createElement("div");
    header.className = "vfm-inline";

    const crestBox = document.createElement("div");
    crestBox.className = "vfm-crest";

    const crestImg = document.createElement("img");
    crestImg.alt = "Escudo";
    crestImg.src = career?.club?.crest || "";
    crestImg.onerror = () => {
      crestImg.remove();
      crestBox.textContent = "⚽";
    };

    if (crestImg.src) crestBox.appendChild(crestImg);
    else crestBox.textContent = "⚽";

    const title = document.createElement("div");
    title.innerHTML = `<strong>${preview.title}</strong><div class="vfm-small">Cargo: ${
      career?.role || "—"
    } | Clube: ${career?.club?.name || "—"}</div>`;

    header.appendChild(crestBox);
    header.appendChild(title);

    const tips = document.createElement("div");
    tips.className = "vfm-list";
    tips.style.marginTop = "12px";

    (preview.tips || []).forEach((t) => {
      const it = document.createElement("div");
      it.className = "vfm-item";
      it.innerHTML = `<div class="vfm-small">${t}</div>`;
      tips.appendChild(it);
    });

    const row = document.createElement("div");
    row.className = "vfm-row";
    row.style.marginTop = "12px";

    const calendar = document.createElement("button");
    calendar.className = "vfm-btn vfm-btn-primary";
    calendar.textContent = "CALENDÁRIO (Fase 4)";
    calendar.onclick = () => alert("Fase 4: calendário completo entra na próxima etapa.");

    const back = document.createElement("button");
    back.className = "vfm-btn vfm-btn-ghost";
    back.textContent = "VOLTAR";
    back.onclick = () => ui.goHome();

    row.appendChild(back);
    row.appendChild(calendar);

    sec.appendChild(header);
    sec.appendChild(tips);

    root.appendChild(h);
    root.appendChild(p);
    root.appendChild(sec);
    root.appendChild(row);
    return root;
  }

  function renderError(msg) {
    const box = document.createElement("div");
    box.className = "vfm-err";
    box.textContent = msg;
    return box;
  }

  function inputRow(label, type, placeholder) {
    const wrap = document.createElement("div");
    wrap.className = "vfm-item";

    const strong = document.createElement("strong");
    strong.textContent = label;

    const input = document.createElement("input");
    input.type = type;
    input.placeholder = placeholder || "";
    input.style.width = "100%";
    input.style.padding = "12px 12px";
    input.style.borderRadius = "14px";
    input.style.border = "1px solid rgba(255,255,255,0.14)";
    input.style.background = "rgba(0,0,0,0.28)";
    input.style.color = "rgba(255,255,255,0.92)";
    input.style.outline = "none";

    wrap.appendChild(strong);
    wrap.appendChild(document.createElement("div")).appendChild(input);

    return { wrap, input };
  }

  function selectRow(label, options) {
    const wrap = document.createElement("div");
    wrap.className = "vfm-item";

    const strong = document.createElement("strong");
    strong.textContent = label;

    const select = document.createElement("select");
    select.style.width = "100%";
    select.style.padding = "12px 12px";
    select.style.borderRadius = "14px";
    select.style.border = "1px solid rgba(255,255,255,0.14)";
    select.style.background = "rgba(0,0,0,0.28)";
    select.style.color = "rgba(255,255,255,0.92)";
    select.style.outline = "none";

    (options || []).forEach((o) => {
      const opt = document.createElement("option");
      opt.value = o.v;
      opt.textContent = o.t;
      select.appendChild(opt);
    });

    wrap.appendChild(strong);
    wrap.appendChild(document.createElement("div")).appendChild(select);

    return { wrap, select };
  }

  NS.UI = UI;
  NS.bootStep?.("UI registrada");
})();