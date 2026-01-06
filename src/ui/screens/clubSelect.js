export async function screenClubSelect({ shell, repos, store, navigate }) {
  const state = store.getState();
  if (!state.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!state.career.slot) { navigate("#/saveSlots"); return { render() {} }; }
  if (!state.career.coach) { navigate("#/careerCreate"); return { render() {} }; }

  const pack = await repos.loadPack(state.app.selectedPackId);
  const clubs = pack.content.clubs.clubs;

  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <div class="card__header">
      <div>
        <div class="card__title">Escolha seu Clube</div>
        <div class="card__subtitle">Escudos carregam de /assets/logos/&lt;ID&gt;.png</div>
      </div>
      <span class="badge">${clubs.length} clubes</span>
    </div>
    <div class="card__body">
      <div class="list" id="list"></div>
      <div style="height:12px"></div>
      <button class="btn" id="back">Voltar</button>
    </div>
  `;

  const list = el.querySelector("#list");
  for (const c of clubs) {
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
      store.update(s => ({
        ...s,
        career: { ...s.career, clubId: c.id }
      }));
      navigate("#/tutorial");
    });
    list.appendChild(item);
  }

  el.querySelector("#back").addEventListener("click", () => navigate("#/careerCreate"));

  shell.mount(el);
  return { render() {} };
}