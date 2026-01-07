// /src/ui/screens/dataPackSelect.js

export async function screenDataPackSelect({ el, store, repos, navigate }) {
  const packs = Array.isArray(repos?.dataPacks) ? repos.dataPacks : [];

  el.innerHTML = `
    <div class="card">
      <h2>Escolha o Pacote de Dados</h2>
      <p>Atualizações (elenco/competições) virão por DLC</p>
      <p>${packs.length} pack(s)</p>

      <div class="list">
        ${
          packs.length === 0
            ? `<div class="muted">Nenhum pacote disponível.</div>`
            : packs
                .map(
                  (p) => `
          <div class="card">
            <strong>${p.name}</strong><br/>
            ${p.recommended ? "<em>Recomendado</em><br/>" : ""}
            <small>ID: ${p.id}</small><br/>
            <button data-id="${p.id}">Selecionar</button>
          </div>
        `
                )
                .join("")
        }
      </div>

      <button id="back">Voltar</button>
    </div>
  `;

  el.querySelectorAll("button[data-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const packId = btn.dataset.id;
      store.setState({
        ...store.getState(),
        app: { ...store.getState().app, selectedPackId: packId },
      });
      navigate("#/saveSlots");
    });
  });

  el.querySelector("#back").addEventListener("click", () => navigate("#/splash"));
}