// src/ui/screens/dataPackSelect.js
import { escapeHtml } from "../util/escapeHtml.js";

export async function screenDataPackSelect({ shell, store, repos, navigate }) {
  const el = document.createElement("div");
  el.className = "grid";

  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Escolha o Pacote de Dados</div>
          <div class="card__subtitle">Atualizações via DLC sem mexer no código</div>
        </div>
        <span class="badge" id="count">...</span>
      </div>

      <div class="card__body">
        <div id="list">
          <div class="muted">Carregando packs...</div>
        </div>
      </div>

      <div class="card__footer">
        <button class="btn" id="back">Voltar</button>
      </div>
    </div>
  `;

  el.querySelector("#back").addEventListener("click", () => navigate("#/splash"));
  shell.mount(el);

  const $list = el.querySelector("#list");
  const $count = el.querySelector("#count");

  const packs = await repos.listPacks();
  const arr = Array.isArray(packs) ? packs : [];

  $count.textContent = `${arr.length} pack(s)`;

  if (!arr.length) {
    $list.innerHTML = `
      <div class="card" style="border-radius:18px">
        <div class="card__body">
          <div style="font-weight:900">Nenhum pack encontrado</div>
          <div class="muted" style="font-size:12px;margin-top:6px">
            Verifique se <code>packs/index.json</code> existe no deploy.
          </div>
        </div>
      </div>
    `;
    return { render() {} };
  }

  $list.innerHTML = arr.map((p) => {
    const id = escapeHtml(p.id);
    const title = escapeHtml(p.title || p.id);
    const desc = escapeHtml(p.description || "");
    return `
      <div class="card" style="border-radius:18px;margin-bottom:10px">
        <div class="card__body" style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div style="min-width:0">
            <div style="font-weight:900">${title}</div>
            <div class="muted" style="font-size:12px;margin-top:4px">${desc}</div>
            <div class="muted" style="font-size:12px;margin-top:6px">ID: ${id}</div>
          </div>
          <button class="btn btn--primary" data-pack="${id}" style="width:auto">Selecionar</button>
        </div>
      </div>
    `;
  }).join("");

  $list.querySelectorAll("button[data-pack]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const packId = btn.getAttribute("data-pack");
      store.update((s) => ({
        ...s,
        app: { ...(s.app || {}), selectedPackId: packId },
      }));
      navigate("#/saveSlots");
    });
  });

  return { render() {} };
}