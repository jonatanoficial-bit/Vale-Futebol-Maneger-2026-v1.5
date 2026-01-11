import { escapeHtml } from "../util/escapeHtml.js";

/**
 * Tela: seleção de Pacote de Dados (DLC)
 * Fluxo:
 * 1) lista packs do registry (repos.listPacks)
 * 2) salva packId no store
 * 3) vai para saveSlots
 */
export async function screenDataPackSelect({ shell, store, repos, navigate }) {
  shell.hideFatal();
  shell.setTopbar({
    subtitle: "Carreira • Treinador",
    rightPill: "AAA",
  });

  shell.clearMain();

  const main = shell.getMain();

  const wrap = document.createElement("div");
  wrap.className = "card";
  wrap.innerHTML = `
    <div class="card__title">Escolha o Pacote de Dados</div>
    <div class="card__subtitle">Atualizações (elenco/competições) virão por DLC sem mexer no código.</div>
    <div style="margin-top:10px; opacity:.9" id="packsCount">Carregando...</div>
    <div style="margin-top:12px; display:grid; gap:10px" id="packsList"></div>
    <div style="margin-top:12px">
      <button class="btn" id="btnBack">Voltar</button>
    </div>
  `;

  main.appendChild(wrap);

  wrap.querySelector("#btnBack").addEventListener("click", () => navigate("splash"));

  let packs = [];
  try {
    packs = await repos.listPacks();
  } catch (e) {
    shell.showFatal(e);
    return;
  }

  const packsCount = wrap.querySelector("#packsCount");
  packsCount.textContent = `${packs.length} pack(s)`;

  const list = wrap.querySelector("#packsList");
  list.innerHTML = "";

  for (const p of packs) {
    const item = document.createElement("div");
    item.className = "card card--sub";
    item.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:10px">
        <div>
          <div style="font-weight:700">${escapeHtml(p.title || p.id)}</div>
          <div style="opacity:.9; margin-top:2px">${escapeHtml(p.description || "")}</div>
          <div style="opacity:.8; margin-top:6px; font-size:12px">ID: ${escapeHtml(p.id)}</div>
        </div>
        <div>
          <button class="btn btn--primary" data-pack="${escapeHtml(p.id)}">Selecionar</button>
        </div>
      </div>
    `;

    item.querySelector("button[data-pack]").addEventListener("click", () => {
      store.update((s) => ({
        ...s,
        selectedPackId: p.id,
      }));
      navigate("saveSlots");
    });

    list.appendChild(item);
  }
}