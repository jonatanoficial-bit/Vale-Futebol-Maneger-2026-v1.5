export async function screenHub({ shell, repos, store, navigate }) {
  const state = store.getState();
  if (!state.career?.clubId) { navigate("#/splash"); return { render() {} }; }

  const pack = await repos.loadPack(state.app.selectedPackId);
  const clubs = pack.content.clubs.clubs;
  const club = clubs.find(c => c.id === state.career.clubId);

  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div class="item__left" style="gap:12px">
          <img class="logo" src="${repos.resolveLogoSrc(club?.logoAssetId || state.career.clubId)}" alt="logo" onerror="this.style.opacity=.25" />
          <div>
            <div class="card__title">${club?.name || "Clube"}</div>
            <div class="card__subtitle">Treinador: ${state.career.coach?.name || "-"}</div>
          </div>
        </div>
        <span class="badge">Hub</span>
      </div>
      <div class="card__body">
        <div class="grid grid--2">
          <button class="btn" id="squad">Elenco</button>
          <button class="btn" id="tactics">Tática (em breve)</button>
          <button class="btn" id="training">Treinos (em breve)</button>
          <button class="btn" id="competitions">Competições (em breve)</button>
          <button class="btn" id="transfers">Transferências (em breve)</button>
          <button class="btn" id="finance">Finanças (em breve)</button>
        </div>

        <div style="height:12px"></div>

        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div class="row">
              <div>
                <div style="font-weight:900">Salvar progresso</div>
                <div class="muted" style="font-size:12px">Slot ${state.career.slot}</div>
              </div>
              <button class="btn btn--primary" style="width:auto;padding:10px 12px" id="save">Salvar</button>
            </div>
          </div>
        </div>

        <div style="height:12px"></div>
        <button class="btn" id="exit">Sair para o menu</button>
      </div>
    </div>
  `;

  el.querySelector("#save").addEventListener("click", () => {
    repos.saves.writeSlot(state.career.slot, store.getState());
    alert("Salvo com sucesso.");
  });

  el.querySelector("#exit").addEventListener("click", () => navigate("#/splash"));

  el.querySelector("#squad").addEventListener("click", () => navigate("#/squad"));

  for (const id of ["tactics","training","competitions","transfers","finance"]) {
    el.querySelector(`#${id}`).addEventListener("click", () => {
      alert("Esse módulo entra nos próximos milestones. Base está sólida e salva corretamente.");
    });
  }

  shell.mount(el);
  return { render() {} };
}