// /src/ui/screens/dataPackSelect.js
export async function screenDataPackSelect({ shell, repos, store, navigate }) {
  const el = document.createElement("div");
  el.className = "grid";

  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Escolha o Pacote de Dados</div>
          <div class="card__subtitle">Atualizações (elenco/competições) virão por DLC</div>
        </div>
        <span class="badge" id="count">...</span>
      </div>

      <div class="card__body" id="list">
        <div class="muted" style="font-size:13px;line-height:1.4">
          Carregando pacotes...
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

  function normalizePacks(raw) {
    // Aceita: Array, {packs:[...]}, {items:[...]}, null/undefined
    if (Array.isArray(raw)) return raw;
    if (raw && Array.isArray(raw.packs)) return raw.packs;
    if (raw && Array.isArray(raw.items)) return raw.items;
    return [];
  }

  function safeText(v) {
    return String(v ?? "").replace(/[<>&"]/g, (c) => ({
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      '"': "&quot;"
    }[c]));
  }

  try {
    const raw = await repos.packs.list();
    const packs = normalizePacks(raw);

    $count.textContent = `${packs.length} pack(s)`;

    if (!packs.length) {
      $list.innerHTML = `
        <div class="muted" style="font-size:13px;line-height:1.4">
          Nenhum pack encontrado.<br/>
          Verifique se existe <b>data-packs/index.json</b> publicado no GitHub Pages.
        </div>
      `;
      return { render() {} };
    }

    const cards = packs.map((p) => {
      const id = safeText(p.id || "pack");
      const name = safeText(p.name || p.title || p.id || "Pacote");
      const desc = safeText(p.description || "—");
      const recommended = !!p.recommended;

      return `
        <div class="row" style="align-items:center;gap:12px;margin-bottom:10px">
          <div class="card" style="flex:1;border-radius:18px">
            <div class="card__body" style="display:flex;align-items:center;justify-content:space-between;gap:12px">
              <div style="min-width:0">
                <div style="font-weight:900;letter-spacing:.2px">${name}${recommended ? ' <span class="badge">Recomendado</span>' : ""}</div>
                <div class="muted" style="font-size:12px;opacity:.85">ID: ${id}</div>
                <div class="muted" style="font-size:12px;opacity:.85;margin-top:4px;line-height:1.35">${desc}</div>
              </div>
              <button class="btn btn--primary" data-pack="${id}">Selecionar</button>
            </div>
          </div>
        </div>
      `;
    }).join("");

    $list.innerHTML = cards;

    $list.querySelectorAll("button[data-pack]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const packId = btn.getAttribute("data-pack");
        const state = store.getState();
        const next = structuredClone(state);

        next.app.selectedPackId = packId;

        store.setState(next);

        // fluxo: pack -> slots
        navigate("#/saveSlots");
      });
    });

    return { render() {} };
  } catch (err) {
    $count.textContent = "Erro";
    $list.innerHTML = `
      <div class="muted" style="font-size:13px;line-height:1.4">
        Falha ao carregar pacotes.<br/>
        <b>${safeText(err?.message || err)}</b>
      </div>
    `;
    return { render() {} };
  }
}