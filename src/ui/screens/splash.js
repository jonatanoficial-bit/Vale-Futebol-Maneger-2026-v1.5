export async function screenSplash({ shell, store, navigate }) {
  const el = document.createElement("div");
  el.className = "grid";

  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Modo Carreira</div>
          <div class="card__subtitle">
            Construa sua história como Treinador. Atualizações via Pacotes de Dados (DLC) sem mexer no código.
          </div>
        </div>
      </div>

      <div class="card__body">
        <button class="btn btn--primary" id="start">Iniciar</button>
        <div style="height:10px"></div>
        <button class="btn" id="admin">Admin</button>
      </div>
    </div>
  `;

  el.querySelector("#start").addEventListener("click", () => {
    const s = store.getState();
    if (!s.app.selectedPackId) navigate("#/dataPackSelect");
    else navigate("#/saveSlots");
  });

  el.querySelector("#admin").addEventListener("click", () => {
    const s = store.getState();
    if (!s.app.selectedPackId) navigate("#/dataPackSelect");
    else navigate("#/admin");
  });

  shell.mount(el);
  return { render() {} };
}