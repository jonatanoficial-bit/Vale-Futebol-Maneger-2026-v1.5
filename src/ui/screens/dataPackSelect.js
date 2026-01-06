export async function screenDataPackSelect({ shell, repos, store, navigate }) {
  const packs = repos.packs;

  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <div class="card__header">
      <div>
        <div class="card__title">Escolha o Pacote de Dados</div>
        <div class="card__subtitle">Atualizações (elenco/competições) virão por DLC</div>
      </div>
      <span class="badge">${packs.length} pack(s)</span>
    </div>
    <div class="card__body">
      <div class="list" id="list"></div>
      <div style="height:12px"></div>
      <button class="btn" id="back">Voltar</button>
    </div>
  `;

  const list = el.querySelector("#list");
  for (const p of packs) {
    const item = document.createElement("div");
    item.className = "item";
    item.innerHTML = `
      <div class="item__left">
        <div>
          <div style="font-weight:900">${p.name}</div>
          <div class="muted" style="font-size:12px">ID: ${p.id}</div>
        </div>
      </div>
      <button class="btn" style="width:auto;padding:10px 12px">Selecionar</button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      store.update(s => ({
        ...s,
        app: { ...s.app, selectedPackId: p.id }
      }));
      navigate("#/saveSlots");
    });
    list.appendChild(item);
  }

  el.querySelector("#back").addEventListener("click", () => navigate("#/splash"));

  shell.mount(el);
  return { render() {} };
}