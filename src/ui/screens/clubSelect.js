export async function screenClubSelect({ shell, repos, store, navigate }) {
  const state = store.getState();
  if (!state.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!state.career.slot) { navigate("#/saveSlots"); return { render() {} }; }
  if (!state.career.coach) { navigate("#/careerCreate"); return { render() {} }; }

  const pack = await repos.loadPack(state.app.selectedPackId);
  let clubs = pack.content.clubs.clubs.slice();

  // ordenação padrão A-Z por nome
  clubs.sort((a, b) => String(a.name).localeCompare(String(b.name), "pt-BR"));

  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <div class="card__header">
      <div>
        <div class="card__title">Escolha seu Clube</div>
        <div class="card__subtitle">Busca, ordenação e suporte a todos os escudos disponíveis</div>
      </div>
      <span class="badge" id="count">${clubs.length} clubes</span>
    </div>
    <div class="card__body">
      <div class="grid grid--2">
        <div class="field" style="margin:0">
          <div class="label">Pesquisar</div>
          <input class="input" id="q" placeholder="Digite nome ou ID (ex: FLA)" />
        </div>
        <div class="field" style="margin:0">
          <div class="label">Ordenação</div>
          <select class="select" id="sort">
            <option value="name_asc">Nome (A-Z)</option>
            <option value="name_desc">Nome (Z-A)</option>
            <option value="id_asc">ID (A-Z)</option>
            <option value="id_desc">ID (Z-A)</option>
          </select>
        </div>
      </div>

      <div style="height:12px"></div>
      <div class="list" id="list"></div>
      <div style="height:12px"></div>
      <button class="btn" id="back">Voltar</button>
    </div>
  `;

  const list = el.querySelector("#list");
  const count = el.querySelector("#count");
  const q = el.querySelector("#q");
  const sort = el.querySelector("#sort");

  function applySort(items, mode) {
    const arr = items.slice();
    if (mode === "name_asc") arr.sort((a,b)=>String(a.name).localeCompare(String(b.name),"pt-BR"));
    if (mode === "name_desc") arr.sort((a,b)=>String(b.name).localeCompare(String(a.name),"pt-BR"));
    if (mode === "id_asc") arr.sort((a,b)=>String(a.id).localeCompare(String(b.id),"pt-BR"));
    if (mode === "id_desc") arr.sort((a,b)=>String(b.id).localeCompare(String(a.id),"pt-BR"));
    return arr;
  }

  function render(items) {
    list.innerHTML = "";
    count.textContent = `${items.length} clubes`;

    // proteção básica para lista muito grande
    const MAX_RENDER = 180;
    const slice = items.slice(0, MAX_RENDER);

    for (const c of slice) {
      const item = document.createElement("div");
      item.className = "item";
      const logoSrc = repos.resolveLogoSrc(c.logoAssetId);
      item.innerHTML = `
        <div class="item__left">
          <img class="logo" src="${logoSrc}" alt="${c.shortName}" onerror="this.style.opacity=.25" />
          <div>
            <div style="font-weight:900">${c.name}</div>
            <div class="muted" style="font-size:12px">ID: ${c.id} • ${c.shortName}</div>
          </div>
        </div>
        <button class="btn btn--primary" style="width:auto;padding:10px 12px">Escolher</button>
      `;
      item.querySelector("button").addEventListener("click", () => {
        store.update(s => ({ ...s, career: { ...s.career, clubId: c.id } }));
        navigate("#/tutorial");
      });
      list.appendChild(item);
    }

    if (items.length > MAX_RENDER) {
      const warn = document.createElement("div");
      warn.className = "item";
      warn.innerHTML = `
        <div class="item__left">
          <div>
            <div style="font-weight:900">Mostrando ${MAX_RENDER} de ${items.length}</div>
            <div class="muted" style="font-size:12px">Use a busca para filtrar e encontrar mais rápido.</div>
          </div>
        </div>
        <span class="badge">Filtro</span>
      `;
      list.appendChild(warn);
    }
  }

  function refresh() {
    const term = q.value.trim().toLowerCase();
    let filtered = clubs;

    if (term) {
      filtered = clubs.filter(c => {
        const hay = `${c.name} ${c.id} ${c.shortName}`.toLowerCase();
        return hay.includes(term);
      });
    }

    filtered = applySort(filtered, sort.value);
    render(filtered);
  }

  q.addEventListener("input", refresh);
  sort.addEventListener("change", refresh);

  el.querySelector("#back").addEventListener("click", () => navigate("#/careerCreate"));

  shell.mount(el);
  refresh();
  return { render() {} };
}