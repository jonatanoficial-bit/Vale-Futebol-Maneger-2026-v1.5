// src/ui/screens/saveSlots.js
export async function screenSaveSlots({ shell, repos, store, navigate }) {
  if (!repos?.saves) {
    // proteção: se alguém remover repos.saves no futuro
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div class="card__header">
        <div>
          <div class="card__title">Erro</div>
          <div class="card__subtitle">Repositório de saves não inicializado</div>
        </div>
      </div>
      <div class="card__body">
        <div class="muted">Verifique src/data/repositories.js (repos.saves).</div>
        <div style="height:12px"></div>
        <button class="btn btn--primary" id="back">Voltar</button>
      </div>
    `;
    el.querySelector("#back").addEventListener("click", () => navigate("#/dataPackSelect"));
    shell.mount(el);
    return { render() {} };
  }

  const saves = repos.saves.readAll();

  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <div class="card__header">
      <div>
        <div class="card__title">Slots de Salvamento</div>
        <div class="card__subtitle">Escolha 1 de 2 slots</div>
      </div>
      <span class="badge">2 slots</span>
    </div>
    <div class="card__body">
      <div class="list" id="list"></div>
      <div style="height:12px"></div>
      <button class="btn" id="back">Voltar</button>
    </div>
  `;

  const list = el.querySelector("#list");

  function slotCard(id) {
    const slot = saves.slots[String(id)] || { exists: false, updatedAt: null };
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item__left">
        <span class="badge">Slot ${id}</span>
        <div>
          <div style="font-weight:900">${slot.exists ? "Carreira existente" : "Novo jogo"}</div>
          <div class="muted" style="font-size:12px">${slot.exists ? `Atualizado: ${slot.updatedAt || "—"}` : "Vazio"}</div>
        </div>
      </div>
      <div style="display:flex; gap:10px; align-items:center;">
        ${slot.exists ? `<button class="btn" style="width:auto;padding:10px 12px" data-act="continue">Continuar</button>` : ""}
        <button class="btn btn--primary" style="width:auto;padding:10px 12px" data-act="select">Selecionar</button>
      </div>
    `;

    div.querySelector(`[data-act="select"]`).addEventListener("click", () => {
      store.update((s) => ({
        ...s,
        app: { ...(s.app || {}), slotId: String(id) },
        career: { ...(s.career || {}), slot: String(id) },
      }));
      navigate("#/careerCreate");
    });

    const cont = div.querySelector(`[data-act="continue"]`);
    if (cont) {
      cont.addEventListener("click", () => {
        const slotData = repos.saves.readSlot(String(id));
        if (!slotData.exists || !slotData.data) return;

        // garante que o slotId fica sincronizado
        const loaded = slotData.data;
        loaded.app = { ...(loaded.app || {}), slotId: String(id) };

        store.setState(loaded);
        navigate("#/hub");
      });
    }

    return div;
  }

  list.appendChild(slotCard(1));
  list.appendChild(slotCard(2));

  el.querySelector("#back").addEventListener("click", () => navigate("#/dataPackSelect"));

  shell.mount(el);
  return { render() {} };
}