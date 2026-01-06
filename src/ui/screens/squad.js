import { calcAge } from "../../domain/playerModel.js";

export async function screenSquad({ shell, repos, store, navigate }) {
  const state = store.getState();
  if (!state.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!state.career?.clubId) { navigate("#/hub"); return { render() {} }; }

  const pack = await repos.loadPack(state.app.selectedPackId);
  const clubs = pack.content.clubs.clubs;
  const club = clubs.find(c => c.id === state.career.clubId);

  const players = pack.indexes.playersByClub.get(state.career.clubId) || [];

  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <div class="card__header">
      <div class="item__left" style="gap:12px">
        <img class="logo" src="${repos.resolveLogoSrc(club?.logoAssetId || state.career.clubId)}" alt="logo" onerror="this.style.opacity=.25" />
        <div>
          <div class="card__title">Elenco</div>
          <div class="card__subtitle">${club?.name || "-"} • ${players.length} jogador(es)</div>
        </div>
      </div>
      <span class="badge">Squad</span>
    </div>
    <div class="card__body">
      <div class="grid grid--2">
        <div class="field" style="margin:0">
          <div class="label">Pesquisar</div>
          <input class="input" id="q" placeholder="Nome, posição ou overall (ex: ST, 82)" />
        </div>
        <div class="field" style="margin:0">
          <div class="label">Ordenação</div>
          <select class="select" id="sort">
            <option value="overall_desc">Overall (maior)</option>
            <option value="overall_asc">Overall (menor)</option>
            <option value="name_asc">Nome (A-Z)</option>
            <option value="pos_asc">Posição (A-Z)</option>
          </select>
        </div>
      </div>

      <div style="height:12px"></div>
      <div class="list" id="list"></div>
      <div style="height:12px"></div>
      <button class="btn" id="back">Voltar</button>
    </div>
  `;

  const $list = el.querySelector("#list");
  const $q = el.querySelector("#q");
  const $sort = el.querySelector("#sort");

  function applySort(items, mode) {
    const arr = items.slice();
    if (mode === "overall_desc") arr.sort((a,b)=>(b.overall-a.overall) || a.name.localeCompare(b.name,"pt-BR"));
    if (mode === "overall_asc") arr.sort((a,b)=>(a.overall-b.overall) || a.name.localeCompare(b.name,"pt-BR"));
    if (mode === "name_asc") arr.sort((a,b)=>a.name.localeCompare(b.name,"pt-BR"));
    if (mode === "pos_asc") arr.sort((a,b)=>String((a.positions||[""])[0]).localeCompare(String((b.positions||[""])[0]),"pt-BR"));
    return arr;
  }

  function render(items) {
    $list.innerHTML = "";
    for (const p of items) {
      const pos = (p.positions || [])[0] || "-";
      const age = calcAge(p.birthDate);
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="item__left">
          <div class="badge" style="min-width:56px;text-align:center">${p.overall}</div>
          <div>
            <div style="font-weight:900">${p.name}</div>
            <div class="muted" style="font-size:12px">${pos} • ${age ?? "?"} anos • ${p.preferredFoot === "L" ? "Canhoto" : "Destro"}</div>
          </div>
        </div>
        <button class="btn" style="width:auto;padding:10px 12px">Ver</button>
      `;
      item.querySelector("button").addEventListener("click", () => {
        navigate(`#/player?pid=${encodeURIComponent(p.id)}`);
      });
      $list.appendChild(item);
    }

    if (items.length === 0) {
      const empty = document.createElement("div");
      empty.className = "item";
      empty.innerHTML = `
        <div class="item__left">
          <div>
            <div style="font-weight:900">Nenhum jogador encontrado</div>
            <div class="muted" style="font-size:12px">Verifique players.json do pack ou ajuste a busca.</div>
          </div>
        </div>
        <span class="badge">0</span>
      `;
      $list.appendChild(empty);
    }
  }

  function refresh() {
    const term = $q.value.trim().toLowerCase();
    let filtered = players;

    if (term) {
      filtered = players.filter(p => {
        const pos = (p.positions || []).join(" ");
        const hay = `${p.name} ${p.id} ${pos} ${p.overall}`.toLowerCase();
        return hay.includes(term);
      });
    }

    filtered = applySort(filtered, $sort.value);
    render(filtered);
  }

  $q.addEventListener("input", refresh);
  $sort.addEventListener("change", refresh);

  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  shell.mount(el);
  refresh();
  return { render() {} };
}