export async function screenCareerCreate({ shell, repos, store, navigate }) {
  const state = store.getState();
  if (!state.app.selectedPackId) {
    navigate("#/dataPackSelect");
    return { render() {} };
  }
  if (!state.career.slot) {
    navigate("#/saveSlots");
    return { render() {} };
  }

  const pack = await repos.loadPack(state.app.selectedPackId);
  const nations = pack.content.nations.nations;

  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <div class="card__header">
      <div>
        <div class="card__title">Criar Carreira</div>
        <div class="card__subtitle">Treinador • Slot ${state.career.slot}</div>
      </div>
      <span class="badge">${pack.manifest.name}</span>
    </div>
    <div class="card__body">
      <div class="grid grid--2">
        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div class="field">
              <div class="label">Nome do treinador</div>
              <input class="input" id="coachName" placeholder="Ex: Jonatan Vale" maxlength="28" />
            </div>
            <div class="field">
              <div class="label">Nacionalidade</div>
              <select class="select" id="nation"></select>
            </div>
            <div class="field">
              <div class="label">Avatar</div>
              <select class="select" id="avatar">
                <option value="avatar_01">Avatar 01</option>
                <option value="avatar_02">Avatar 02</option>
                <option value="avatar_03">Avatar 03</option>
                <option value="avatar_04">Avatar 04</option>
              </select>
            </div>
          </div>
        </div>

        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div class="h1">Diretriz Premium</div>
            <div class="p">
              Você seleciona um <b>Pacote de Dados</b> e a carreira fica vinculada a ele.
              Futuras atualizações entram como <b>DLC</b> sem quebrar o seu save.
            </div>
            <div style="height:12px"></div>
            <button class="btn btn--primary" id="continue">Continuar</button>
            <div style="height:10px"></div>
            <button class="btn" id="back">Voltar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const nationSelect = el.querySelector("#nation");
  for (const n of nations) {
    const opt = document.createElement("option");
    opt.value = n.id;
    opt.textContent = n.name;
    nationSelect.appendChild(opt);
  }
  nationSelect.value = "BRA";

  el.querySelector("#back").addEventListener("click", () => navigate("#/saveSlots"));
  el.querySelector("#continue").addEventListener("click", () => {
    const coachName = el.querySelector("#coachName").value.trim();
    if (!coachName) {
      alert("Informe o nome do treinador.");
      return;
    }
    const coach = {
      name: coachName,
      nationalityId: nationSelect.value,
      avatarId: el.querySelector("#avatar").value
    };

    store.update(s => ({
      ...s,
      career: { ...s.career, coach }
    }));

    navigate("#/clubSelect");
  });

  shell.mount(el);
  return { render() {} };
}