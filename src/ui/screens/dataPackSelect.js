// src/ui/screens/dataPackSelect.js

import { escapeHtml } from "../util/escapeHtml.js";

export async function screenDataPackSelect({ store, repos, navigate }) {
  const packsRaw =
    (typeof repos?.listPacks === "function" ? await repos.listPacks() : null) ??
    repos?.dataPacks ??
    [];

  const packs = Array.isArray(packsRaw) ? packsRaw : (packsRaw?.packs ?? []);

  const items = packs
    .map((p) => {
      const title = escapeHtml(p.title ?? p.name ?? p.id ?? "Pack");
      const desc = escapeHtml(p.description ?? "");
      const id = escapeHtml(p.id ?? "");

      return `
        <div class="card card--pad">
          <div class="row row--between row--center">
            <div>
              <div class="title">${title}</div>
              ${desc ? `<div class="muted">${desc}</div>` : ""}
              <div class="muted">ID: <span class="mono">${id}</span></div>
            </div>
            <button class="btn btn--primary" data-pack="${id}">Selecionar</button>
          </div>
        </div>
      `;
    })
    .join("");

  const el = document.createElement("div");
  el.className = "screen";
  el.innerHTML = `
    <div class="panel">
      <div class="panel__head">
        <div class="panel__title">Escolha o Pacote de Dados</div>
        <div class="panel__subtitle">Atualizações (elenco/competições) virão por DLC</div>
      </div>

      <div class="panel__body">
        <div class="muted">${packs.length} pack(s)</div>
        <div class="stack">${items || `<div class="card card--pad"><div class="muted">Nenhum pack encontrado.</div></div>`}</div>

        <div class="row row--between" style="margin-top:12px">
          <button class="btn" id="back">Voltar</button>
        </div>
      </div>
    </div>
  `;

  el.querySelectorAll("[data-pack]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const packId = btn.getAttribute("data-pack") || "";
      store.set((s) => ({ ...s, selectedPackId: packId }));
      navigate("#/saveSlots");
    });
  });

  el.querySelector("#back").addEventListener("click", () => navigate("#/"));

  return el;
}
