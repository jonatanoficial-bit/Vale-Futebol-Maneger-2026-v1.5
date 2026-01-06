import { deriveUserSquad, rosterStats } from "../../domain/roster/rosterService.js";

export async function screenSquad({ shell, repos, store, navigate }) {
  const state = store.getState();
  if (!state.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!state.career?.clubId) { navigate("#/hub"); return { render() {} }; }

  const pack = await repos.loadPack(state.app.selectedPackId);
  const clubId = state.career.clubId;

  const clubs = pack.content.clubs.clubs;
  const club = clubs.find(c => c.id === clubId);

  const squad = deriveUserSquad({ pack, state: store.getState() });
  const stats = rosterStats(squad);

  function logoSrc(id) {
    return repos.resolveLogoSrc(id);
  }

  function faceSrc(player) {
    // se você tiver faces no /assets/face/<ID>.png, pode ligar aqui
    return null;
  }

  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div class="item__left" style="gap:12px">
          <img class="logo" src="${logoSrc(club?.logoAssetId || clubId)}" alt="logo" onerror="this.style.opacity=.25" />
          <div>
            <div class="card__title">Elenco</div>
            <div class="card__subtitle">${club?.name || clubId} • ${stats.size} jogador(es) • OVR médio ${stats.avg}</div>
          </div>
        </div>
        <span class="badge">Squad</span>
      </div>

      <div class="card__body">
        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div style="font-weight:900">Pesquisar</div>
            <div style="height:8px"></div>
            <input class="input" id="q" placeholder="Nome, posição ou overall (ex: ST, 82)" />
            <div style="height:10px"></div>
            <div style="font-weight:900">Ordenação</div>
            <div style="height:8px"></div>
            <select class="select" id="sort">
              <option value="OVR_DESC">Overall (maior)</option>
              <option value="OVR_ASC">Overall (menor)</option>
              <option value="POS">Posição</option>
              <option value="NAME">Nome</option>
            </select>
          </div>
        </div>

        <div style="height:12px"></div>
        <div class="list" id="list"></div>

        <div style="height:12px"></div>
        <button class="btn" id="back">Voltar</button>
      </div>
    </div>
  `;

  const $q = el.querySelector("#q");
  const $sort = el.querySelector("#sort");
  const $list = el.querySelector("#list");

  function applySort(arr, mode) {
    const a = arr.slice();
    if (mode === "OVR_ASC") a.sort((x,y)=>(x.overall-y.overall) || x.name.localeCompare(y.name,"pt-BR"));
    else if (mode === "POS") a.sort((x,y)=>String(x.positions?.[0]||"").localeCompare(String(y.positions?.[0]||""),"pt-BR") || (y.overall-x.overall));
    else if (mode === "NAME") a.sort((x,y)=>x.name.localeCompare(y.name,"pt-BR"));
    else a.sort((x,y)=>(y.overall-x.overall) || x.name.localeCompare(y.name,"pt-BR"));
    return a;
  }

  function filter(arr, query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return arr;
    return arr.filter(p => {
      const name = String(p.name || "").toLowerCase();
      const pos = String((p.positions && p.positions[0]) || "").toLowerCase();
      const ovr = String(p.overall || "");
      return name.includes(q) || pos.includes(q) || ovr === q;
    });
  }

  function render() {
    const items = applySort(filter(squad, $q.value), $sort.value);

    $list.innerHTML = "";
    for (const p of items) {
      const pos = (p.positions && p.positions[0]) || "-";
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="item__left" style="gap:12px">
          <div class="badge" style="min-width:56px;text-align:center">${pos}</div>
          <div>
            <div style="font-weight:900">${p.name}</div>
            <div class="muted" style="font-size:12px">
              OVR ${p.overall} • ${p.age || "-"} anos • ${p.nationality || "—"} ${p.generated ? "• Gerado" : ""}
            </div>
          </div>
        </div>
        <span class="badge">${p.overall}</span>
      `;
      item.addEventListener("click", () => navigate(`#/player?id=${encodeURIComponent(p.id)}`));
      $list.appendChild(item);
    }

    if (items.length === 0) {
      $list.innerHTML = `
        <div class="item">
          <div class="item__left">
            <div>
              <div style="font-weight:900">Nenhum jogador encontrado</div>
              <div class="muted" style="font-size:12px">Ajuste a busca.</div>
            </div>
          </div>
          <span class="badge">0</span>
        </div>
      `;
    }
  }

  $q.addEventListener("input", render);
  $sort.addEventListener("change", render);
  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  shell.mount(el);
  render();

  return { render() {} };
}