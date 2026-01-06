import { calcAge } from "../../domain/playerModel.js";

function renderAttrTable(player) {
  const pos = (player.positions || [])[0] || "ST";
  const a = player.attributes || {};

  const rows = [];
  if (pos === "GK") {
    rows.push(["DIV", a.gk_div], ["HAN", a.gk_han], ["KIC", a.gk_kic], ["REF", a.gk_ref], ["SPE", a.gk_spe], ["POS", a.gk_pos]);
  } else {
    rows.push(["PAC", a.pac], ["SHO", a.sho], ["PAS", a.pas], ["DRI", a.dri], ["DEF", a.def], ["PHY", a.phy]);
  }

  const htmlRows = rows.map(([k,v]) => `
    <div class="item" style="border-radius:14px">
      <div class="item__left">
        <span class="badge">${k}</span>
        <div style="font-weight:900">${typeof v === "number" ? v : "-"}</div>
      </div>
      <span class="badge">Atributo</span>
    </div>
  `).join("");

  return `<div class="list">${htmlRows}</div>`;
}

export async function screenPlayer({ shell, repos, store, navigate, params }) {
  const state = store.getState();
  if (!state.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }

  const pid = params.pid;
  if (!pid) { navigate("#/hub"); return { render() {} }; }

  const pack = await repos.loadPack(state.app.selectedPackId);
  const p = pack.indexes.playersById.get(pid);

  if (!p) {
    const el = document.createElement("div");
    el.className = "card";
    el.innerHTML = `
      <div class="card__body">
        <div class="h1">Jogador não encontrado</div>
        <div class="p">ID: <b>${pid}</b>. Verifique players.json no pack atual.</div>
        <div style="height:12px"></div>
        <button class="btn btn--primary" id="back">Voltar</button>
      </div>
    `;
    el.querySelector("#back").addEventListener("click", () => navigate("#/squad"));
    shell.mount(el);
    return { render() {} };
  }

  const clubs = pack.content.clubs.clubs;
  const club = clubs.find(c => c.id === p.clubId);
  const age = calcAge(p.birthDate);
  const mainPos = (p.positions || [])[0] || "-";

  const faceSrc = repos.resolveFaceSrc(p.id);

  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">${p.name}</div>
          <div class="card__subtitle">${club?.name || p.clubId} • ${mainPos}</div>
        </div>
        <span class="badge">${p.overall}</span>
      </div>
      <div class="card__body">
        <div class="grid grid--2">
          <div class="card" style="border-radius:18px">
            <div class="card__body" style="display:flex; gap:12px; align-items:center;">
              <img src="${faceSrc}" alt="face" style="width:84px;height:84px;border-radius:22px;border:1px solid rgba(255,255,255,.12);object-fit:cover;background:rgba(0,0,0,.22)" onerror="this.style.opacity=.25;this.src='data:image/svg+xml;utf8,${encodeURIComponent(fallbackSvg())}'" />
              <div>
                <div style="font-weight:900;font-size:16px">${p.name}</div>
                <div class="muted" style="font-size:12px">${age ?? "?"} anos • ${p.heightCm ?? "?"} cm • ${p.preferredFoot === "L" ? "Canhoto" : "Destro"}</div>
                <div style="height:8px"></div>
                <div class="row">
                  <span class="badge">ID: ${p.id}</span>
                  <span class="badge">${(p.positions || []).join(" / ")}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Resumo</div>
              <div class="muted" style="font-size:12px; margin-top:6px; line-height:1.35">
                Este é o MVP do modelo de jogador (estilo FIFA-like).  
                No próximo milestone entra: forma, moral, stamina, contrato e potencial.
              </div>
              <div style="height:12px"></div>
              <button class="btn btn--primary" id="backSquad">Voltar ao Elenco</button>
              <div style="height:10px"></div>
              <button class="btn" id="backHub">Ir ao Hub</button>
            </div>
          </div>
        </div>

        <div style="height:12px"></div>
        ${renderAttrTable(p)}
      </div>
    </div>
  `;

  el.querySelector("#backSquad").addEventListener("click", () => navigate("#/squad"));
  el.querySelector("#backHub").addEventListener("click", () => navigate("#/hub"));

  shell.mount(el);
  return { render() {} };

  function fallbackSvg() {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">
        <rect width="100%" height="100%" rx="22" ry="22" fill="rgba(0,0,0,.35)"/>
        <circle cx="60" cy="48" r="20" fill="rgba(255,255,255,.20)"/>
        <rect x="26" y="74" width="68" height="30" rx="15" fill="rgba(255,255,255,.14)"/>
      </svg>
    `.trim();
  }
}