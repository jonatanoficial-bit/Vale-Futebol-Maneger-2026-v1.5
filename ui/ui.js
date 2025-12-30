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
      career: null,

      // Fase 3: dados derivados (roster, news, finance)
      careerData: null,

      // dentro do Lobby
      lobbyTab: "squad"
    },

    // ---------------------------------------------------------------------
    // Compatibilidade com o Boot (boot.js)
    // O boot espera UI.init(mountEl) e UI.go(screen).
    // Nesta UI, o fluxo principal sempre existiu via UI.start() + UI.nav().
    // Para não quebrar nada (e não duplicar lógica), criamos aliases estáveis.
    // ---------------------------------------------------------------------
    init(mountEl) {
      const NS = window.VFM26;
      // Mesmo comportamento do start(), mas sem navegação automática.
      this.mount = mountEl || document.getElementById("app");

      NS.bootAssert?.(
        this.mount,
        "DOM não está pronto.",
        "Elemento #app não encontrado.",
        "BOOT_E01_DOM_NOT_READY"
      );

      NS.bootAssert?.(
        NS.Engine,
        "Engine não registrada",
        "window.VFM26.Engine não existe.",
        "BOOT_E03_ENGINE_NOT_REGISTERED"
      );

      NS.bootAssert?.(
        NS.Game,
        "Game não registrado",
        "window.VFM26.Game não existe.",
        "BOOT_E04_GAME_NOT_FOUND"
      );

      // Render base mínima (home) sem forçar navegação.
      this.render();
    },

    go(screen) {
      this.nav(screen);
    },

    start() {
      const NS = window.VFM26;
      this.mount = document.getElementById("app");
      NS.bootAssert?.(
        this.mount,
        "DOM não está pronto.",
        "Elemento #app não encontrado.",
        "BOOT_E01_DOM_NOT_READY"
      );

      NS.bootAssert?.(
        NS.Engine,
        "Engine não registrada",
        "window.VFM26.Engine não existe.",
        "BOOT_E03_ENGINE_NOT_REGISTERED"
      );

      NS.bootAssert?.(
        NS.Game,
        "Game não registrado",
        "window.VFM26.Game não existe.",
        "BOOT_E04_GAME_NOT_FOUND"
      );

      this.render();
    },

    nav(screen) {
      const NS = window.VFM26;
      this.screen = screen;
      this.error = null;

      // quando entra no lobby, garante carreira carregada do slot
      if (screen === "lobby") {
        const slot = NS.Engine.getSlot(this.data.slotId);
        const career = this.data.career || slot?.career || null;
        this.data.career = career;

        // cria cache dos dados da carreira (Fase 3)
        if (career) {
          this.data.careerData = NS.Game.buildCareerData(career);
        } else {
          this.data.careerData = null;
        }

        // aba inicial por cargo
        const role = career?.role || "coach";
        const menu = NS.Game.getLobbyMenu(role);
        this.data.lobbyTab = menu?.[0]?.id || "squad";
      }

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

    setLobbyTab(tabId) {
      this.data.lobbyTab = tabId;
      this.render();
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
    p.textContent =
      "Simulador de futebol manager. Base sólida pronta. Agora: DataPack, Saves e Lobby (Fase 3).";

    const sec = document.createElement("div");
    sec.className = "vfm-section";

    const tag = document.createElement("div");
    tag.className = "vfm-pill";
    tag.textContent = `Engine v${NS.Engine?.version || "?"} • Core v${NS.Game?.version || "?"}`;

    const h3 = document.createElement("h3");
    h3.textContent = "MODO CARREIRA";

    const info = document.createElement("div");
    info.className = "vfm-small";
    info.textContent = "Fluxo obrigatório: DataPack → Save Slot → Carreira → Lobby.";

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
      create.onclick = () => {
        ui.data.slotId = slotId;
        // Se já tem carreira, vai direto ao lobby
        if (slot?.career) {
          ui.data.career = slot.career;
          ui.nav("lobby");
        } else {
          ui.selectSlot(slotId);
        }
      };

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

    const form = document.createElement("div");
    form.className = "vfm-list";

    const name = inputRow("Nome do Manager", "text", "Ex: Jonatan Vale");
    const country = inputRow("País", "text", "Brasil");
    const role = selectRow("Cargo", [
      { v: "coach", t: "Treinador" },
      { v: "sporting", t: "Diretor Esportivo" },
      { v: "president", t: "Presidente" }
    ]);

    const clubs = NS.Engine.getClubsFromPack();
    const clubOptions = clubs.map((c) => ({
      v: c.id,
      t: `${c.name} (${c.league === "A" ? "Série A" : c.league === "B" ? "Série B" : c.league})`
    }));

    const club = selectRow(
      "Clube",
      clubOptions.length ? clubOptions : [{ v: "", t: "Nenhum clube no pack" }]
    );

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
          ? {
              id: found.id,
              name: found.name,
              crest: found.crest,
              league: found.league,
              state: found.state,
              rating: found.rating,
              budget: found.budget
            }
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

    const career = ui.data.career || NS.Engine.getSlot(ui.data.slotId)?.career || null;
    if (!career) {
      ui.setError("Carreira não encontrada. Volte e selecione um Save Slot.");
      return renderHome(ui);
    }

    const header = NS.Game.buildLobbyHeader(career);
    const menu = NS.Game.getLobbyMenu(career.role);
    const data = ui.data.careerData || NS.Game.buildCareerData(career);

    // título
    const h = document.createElement("h1");
    h.className = "vfm-title";
    h.textContent = header.title;

    const p = document.createElement("p");
    p.className = "vfm-sub";
    p.textContent = header.subtitle;

    // Card topo com escudo + boas-vindas
    const secTop = document.createElement("div");
    secTop.className = "vfm-section";

    const topLine = document.createElement("div");
    topLine.className = "vfm-inline";

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

    const topText = document.createElement("div");
    topText.innerHTML = `
      <strong>${header.welcome}</strong>
      <div class="vfm-small">Cargo: ${career.role} | Clube: ${career?.club?.name || "—"}</div>
    `;

    topLine.appendChild(crestBox);
    topLine.appendChild(topText);

    // Abas do Lobby
    const tabsWrap = document.createElement("div");
    tabsWrap.style.marginTop = "12px";
    tabsWrap.style.display = "flex";
    tabsWrap.style.gap = "10px";
    tabsWrap.style.flexWrap = "wrap";

    menu.forEach((m) => {
      const b = document.createElement("button");
      b.className = "vfm-btn " + (ui.data.lobbyTab === m.id ? "vfm-btn-primary" : "vfm-btn-ghost");
      b.style.minWidth = "0";
      b.style.padding = "10px 12px";
      b.textContent = m.label;
      b.onclick = () => ui.setLobbyTab(m.id);
      tabsWrap.appendChild(b);
    });

    // Conteúdo da aba
    const secBody = document.createElement("div");
    secBody.className = "vfm-section";
    secBody.style.marginTop = "12px";

    const content = renderLobbyTab(ui, career, data);
    secBody.appendChild(content);

    // Rodapé
    const row = document.createElement("div");
    row.className = "vfm-row";
    row.style.marginTop = "12px";

    const back = document.createElement("button");
    back.className = "vfm-btn vfm-btn-ghost";
    back.textContent = "VOLTAR";
    back.onclick = () => ui.goHome();

    const calendar = document.createElement("button");
    calendar.className = "vfm-btn vfm-btn-primary";
    calendar.textContent = "CALENDÁRIO (Fase 4)";
    calendar.onclick = () => ui.setLobbyTab("agenda");

    row.appendChild(back);
    row.appendChild(calendar);

    secTop.appendChild(topLine);
    secTop.appendChild(tabsWrap);

    root.appendChild(h);
    root.appendChild(p);
    root.appendChild(secTop);
    root.appendChild(secBody);
    root.appendChild(row);
    return root;
  }

  function renderLobbyTab(ui, career, data) {
    const tab = ui.data.lobbyTab;

    if (tab === "squad") {
      const box = document.createElement("div");
      box.innerHTML = `<h3>Elenco</h3><div class="vfm-small">Lista inicial (gerada na Fase 3). Em fases seguintes, elenco real + transferências completas.</div>`;

      const list = document.createElement("div");
      list.className = "vfm-list";
      list.style.marginTop = "10px";

      data.roster.slice(0, 18).forEach((p) => {
        const it = document.createElement("div");
        it.className = "vfm-item";
        it.innerHTML = `
          <div class="vfm-inline">
            <div class="vfm-pill">#${p.number}</div>
            <div style="flex:1">
              <strong>${p.name}</strong>
              <div class="vfm-small">${p.pos} • ${p.age} anos • Overall ${p.overall} • Pot ${p.potential}</div>
            </div>
            <div class="vfm-pill">Moral ${p.morale}</div>
            <div class="vfm-pill">Fit ${p.fitness}</div>
          </div>
        `;
        list.appendChild(it);
      });

      box.appendChild(list);
      return box;
    }

    if (tab === "training") {
      const box = document.createElement("div");
      box.innerHTML = `
        <h3>Treinos</h3>
        <div class="vfm-small">
          Estrutura pronta. Na próxima etapa vamos ligar treinos semanais → evolução de atributos e impacto em resultados.
        </div>
      `;

      const list = document.createElement("div");
      list.className = "vfm-list";
      list.style.marginTop = "10px";

      [
        { t: "Treino Físico", d: "Aumenta fitness e reduz risco de queda no fim do jogo (Fase 4+)." },
        { t: "Treino Tático", d: "Ajusta estilo de jogo e organização (Fase 4+)." },
        { t: "Treino Finalização", d: "Beneficia atacantes e meio ofensivo (Fase 4+)." }
      ].forEach((x) => {
        const it = document.createElement("div");
        it.className = "vfm-item";
        it.innerHTML = `<strong>${x.t}</strong><div class="vfm-small">${x.d}</div>`;
        list.appendChild(it);
      });

      box.appendChild(list);
      return box;
    }

    if (tab === "news") {
      const box = document.createElement("div");
      box.innerHTML = `<h3>Notícias</h3><div class="vfm-small">Feed inicial (Fase 3). Depois: notícias dinâmicas e efeitos no moral.</div>`;

      const list = document.createElement("div");
      list.className = "vfm-list";
      list.style.marginTop = "10px";

      data.news.forEach((n) => {
        const it = document.createElement("div");
        it.className = "vfm-item";
        it.innerHTML = `<strong>${n.title}</strong><div class="vfm-small">${n.body}</div>`;
        list.appendChild(it);
      });

      box.appendChild(list);
      return box;
    }

    if (tab === "agenda") {
      const box = document.createElement("div");
      box.innerHTML = `
        <h3>Agenda</h3>
        <div class="vfm-small">
          Fase 3: tela base. Fase 4: calendário completo com partidas/treinos/eventos.
        </div>
      `;

      const it = document.createElement("div");
      it.className = "vfm-item";
      it.innerHTML = `<strong>Em breve</strong><div class="vfm-small">Aqui entra a lista de datas e compromissos (Fase 4).</div>`;
      box.appendChild(it);
      return box;
    }

    if (tab === "finance") {
      const box = document.createElement("div");
      box.innerHTML = `
        <h3>Finanças</h3>
        <div class="vfm-small">Disponível principalmente para Presidente. Depois: receitas, despesas, contratos, estádio/CT.</div>
      `;

      const f = data.finance;
      const list = document.createElement("div");
      list.className = "vfm-list";
      list.style.marginTop = "10px";

      const items = [
        { t: "Orçamento", v: money(f.budget) },
        { t: "Folha (limite)", v: money(f.wageBudget) },
        { t: "Receita mensal (estimada)", v: money(f.incomeMonthly) },
        { t: "Despesas mensais (estimada)", v: money(f.expensesMonthly) }
      ];

      items.forEach((x) => {
        const it = document.createElement("div");
        it.className = "vfm-item";
        it.innerHTML = `<strong>${x.t}</strong><div class="vfm-small">${x.v}</div>`;
        list.appendChild(it);
      });

      box.appendChild(list);
      return box;
    }

    if (tab === "stats") {
      const box = document.createElement("div");
      box.innerHTML = `
        <h3>Estatísticas</h3>
        <div class="vfm-small">Fase 3: estrutura. Fase 4+: partidas geram estatísticas reais.</div>
      `;

      const it = document.createElement("div");
      it.className = "vfm-item";
      it.innerHTML = `<strong>Sem dados ainda</strong><div class="vfm-small">Quando as partidas existirem, aqui terá artilharia, desempenho, tabela e gráficos.</div>`;
      box.appendChild(it);
      return box;
    }

    if (tab === "transfers") {
      const box = document.createElement("div");
      box.innerHTML = `
        <h3>Mercado</h3>
        <div class="vfm-small">Tela base para Diretor Esportivo. Fase 4+: compras, vendas, empréstimos e staff.</div>
      `;

      const it = document.createElement("div");
      it.className = "vfm-item";
      it.innerHTML = `<strong>Em breve</strong><div class="vfm-small">Lista de alvos, propostas e negociações entram na próxima etapa.</div>`;
      box.appendChild(it);
      return box;
    }

    const fallback = document.createElement("div");
    fallback.className = "vfm-item";
    fallback.innerHTML = `<strong>Aba não encontrada</strong><div class="vfm-small">ID: ${String(tab)}</div>`;
    return fallback;
  }

  function money(v) {
    try {
      return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
    } catch (_) {
      return "R$ " + String(v || 0);
    }
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