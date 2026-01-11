// src/ui/screens/dataPackSelect.js
import { escapeHtml } from "../util/escapeHtml.js";

export async function screenDataPackSelect(ctx) {
  const { el, navigate, store, repos } = ctx;

  // Guard-rails para não dar “packs is not iterable”
  if (!store || !repos) {
    el.innerHTML = `
      <div class="card">
        <h2>Erro</h2>
        <p>Store/Repos não inicializados. Verifique src/app/bootstrap.js.</p>
        <button class="btn btn-primary" id="goStart">Voltar</button>
      </div>
    `;
    el.querySelector("#goStart")?.addEventListener("click", () => navigate("#/start"));
    return;
  }

  el.innerHTML = `
    <div class="card">
      <h2>Escolha o Pacote de Dados</h2>
      <p>Atualizações (elenco/competições) virão por DLC sem mexer no código.</p>
      <div id="packsList" class="list"></div>
      <div class="row" style="margin-top:12px; gap:12px;">
        <button class="btn" id="backBtn">Voltar</button>
      </div>
    </div>
  `;

  el.querySelector("#backBtn")?.addEventListener("click", () => navigate("#/start"));

  const packsListEl = el.querySelector("#packsList");

  let packs = [];
  try {
    packs = await repos.listPacks();
    if (!Array.isArray(packs)) packs = [];
  } catch (e) {
    packsListEl.innerHTML = `
      <div class="muted">
        Não foi possível carregar packs. Verifique <code>/packs/index.json</code>.
      </div>
    `;
    throw e;
  }

  if (packs.length === 0) {
    packsListEl.innerHTML = `
      <div class="muted">
        Nenhum pack encontrado. Confirme se existe <code>packs/index.json</code> no deploy.
      </div>
    `;
    return;
  }

  // Render cards
  packsListEl.innerHTML = packs
    .map((p) => {
      const title = escapeHtml(p?.title || "Pack");
      const subtitle = escapeHtml(p?.subtitle || "");
      const id = escapeHtml(p?.id || "");
      const note = escapeHtml(p?.note || "");
      return `
        <div class="card" style="margin-top:12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
            <div>
              <div style="font-weight:700; font-size:18px;">${title}</div>
              <div class="muted" style="margin-top:2px;">${subtitle}</div>
              <div class="muted" style="margin-top:6px;">ID: ${id}</div>
              <div class="muted" style="margin-top:6px;">${note || "&nbsp;"}</div>
            </div>
            <div>
              <button class="btn btn-primary" data-pack="${id}">Selecionar</button>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  // Clique selecionar
  packsListEl.querySelectorAll("button[data-pack]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const packId = btn.getAttribute("data-pack");

      store.update((st) => ({
        ...st,
        app: {
          ...(st.app || {}),
          selectedPackId: packId,
        },
      }));

      // Próximo passo natural do fluxo: escolher slot
      navigate("#/saveSlots");
    });
  });
}