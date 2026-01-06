import { ensureTransferState, generateMarket } from "../../domain/transfers/transferMarket.js";
import { signFromMarket, releasePlayer } from "../../domain/transfers/transferService.js";
import { deriveUserSquad } from "../../domain/roster/rosterService.js";

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export async function screenTransfers({ shell, repos, store, navigate }) {
  const s0 = store.getState();
  if (!s0.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!s0.career?.clubId) { navigate("#/hub"); return { render() {} }; }

  const pack = await repos.loadPack(s0.app.selectedPackId);
  store.setState(ensureTransferState(store.getState()));

  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Transferências</div>
          <div class="card__subtitle">Mercado + Contratos (v1.0.0)</div>
        </div>
        <span class="badge">v1.0</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2">

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Mercado</div>
              <div class="muted" style="font-size:12px;margin-top:6px;line-height:1.35">
                Jogadores livres (MVP). Você faz proposta e o jogador pode aceitar/recusar.
              </div>

              <div style="height:12px"></div>

              <div class="grid grid--2">
                <button class="btn btn--primary" id="refresh">Atualizar Mercado</button>
                <select class="select" id="pos">
                  <option value="">Todas posições</option>
                  <option value="GK">GK</option><option value="CB">CB</option><option value="RB">RB</option><option value="LB">LB</option>
                  <option value="CDM">CDM</option><option value="CM">CM</option><option value="CAM">CAM</option>
                  <option value="RW">RW</option><option value="LW">LW</option><option value="ST">ST</option>
                </select>
              </div>

              <div style="height:10px"></div>
              <div class="list" id="market"></div>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Seu elenco</div>
              <div class="muted" style="font-size:12px;margin-top:6px">Dispensar jogadores (MVP)</div>
              <div style="height:12px"></div>
              <div class="list" id="squad"></div>

              <div style="height:12px"></div>
              <div style="font-weight:900">Propostas recentes</div>
              <div style="height:10px"></div>
              <div class="list" id="offers"></div>
            </div>
          </div>

        </div>

        <div style="height:12px"></div>
        <button class="btn" id="back">Voltar</button>
      </div>
    </div>
  `;

  const $market = el.querySelector("#market");
  const $squad = el.querySelector("#squad");
  const $offers = el.querySelector("#offers");
  const $pos = el.querySelector("#pos");

  function getWeekKey() {
    // usa data local (semana/dia) como variação do mercado
    return new Date().toISOString().slice(0, 10);
  }

  function ensureMarket() {
    const s = store.getState();
    if (!s.career.transfers.market || s.career.transfers.market.length === 0) {
      const mk = getWeekKey();
      const market = generateMarket({ packId: s.app.selectedPackId, clubId: s.career.clubId, weekKey: mk, count: 48 });
      const next = structuredClone(s);
      next.career.transfers.marketSeed = mk;
      next.career.transfers.market = market;
      store.setState(next);
    }
  }

  function renderMarket() {
    ensureMarket();
    const s = store.getState();
    const posFilter = $pos.value;
    const list = (s.career.transfers.market || [])
      .filter(p => !posFilter || (p.positions && p.positions.includes(posFilter)))
      .slice()
      .sort((a, b) => (b.overall - a.overall) || (a.value - b.value));

    $market.innerHTML = "";
    for (const p of list.slice(0, 40)) {
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `
        <div class="item__left">
          <div style="font-weight:900">${p.name} <span class="muted" style="font-weight:700">(${p.positions?.[0] || "-"})</span></div>
          <div class="muted" style="font-size:12px;line-height:1.35">
            OVR ${p.overall} • Idade ${p.age} • Valor ${money(p.value)} • Salário sugerido ${money(p.wageMonthly)}
          </div>
        </div>
        <button class="btn btn--primary" style="width:auto" data-buy="${p.id}">Propor</button>
      `;
      $market.appendChild(row);
    }

    $market.querySelectorAll("[data-buy]").forEach(btn => {
      btn.addEventListener("click", () => openOffer(btn.getAttribute("data-buy")));
    });
  }

  function renderSquad() {
    const s = store.getState();
    const squad = deriveUserSquad({ pack, state: s })
      .slice()
      .sort((a, b) => (b.overall - a.overall) || a.name.localeCompare(b.name, "pt-BR"))
      .slice(0, 28);

    $squad.innerHTML = "";
    for (const p of squad) {
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `
        <div class="item__left">
          <div style="font-weight:900">${p.name} <span class="muted" style="font-weight:700">(${p.positions?.[0] || "-"})</span></div>
          <div class="muted" style="font-size:12px">OVR ${p.overall} • Salário ${money(p.contract?.wageMonthly ?? p.wageMonthly ?? 0)}</div>
        </div>
        <button class="btn" style="width:auto" data-release="${p.id}">Dispensar</button>
      `;
      $squad.appendChild(row);
    }

    $squad.querySelectorAll("[data-release]").forEach(btn => {
      btn.addEventListener("click", () => {
        const pid = btn.getAttribute("data-release");
        const ok = confirm("Dispensar este jogador? (MVP: sem multa)");
        if (!ok) return;
        const res = releasePlayer({ state: store.getState(), playerId: pid });
        store.setState(res.state);
        renderAll();
      });
    });
  }

  function renderOffers() {
    const s = store.getState();
    const offers = (s.career.transfers.offers || []).slice(0, 12);

    $offers.innerHTML = "";
    if (offers.length === 0) {
      $offers.innerHTML = `<div class="muted" style="font-size:12px">Nenhuma proposta ainda.</div>`;
      return;
    }

    for (const o of offers) {
      const p = o.playerSnapshot;
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `
        <div class="item__left">
          <div style="font-weight:900">${p?.name || o.playerId}</div>
          <div class="muted" style="font-size:12px;line-height:1.35">
            Taxa ${money(o.fee)} • Salário ${money(o.wageMonthly)} • ${o.years} ano(s) • Status: ${o.status}
          </div>
        </div>
        <span class="badge">${o.status}</span>
      `;
      $offers.appendChild(row);
    }
  }

  function openOffer(playerId) {
    const s = store.getState();
    const player = (s.career.transfers.market || []).find(x => x.id === playerId);
    if (!player) return alert("Jogador não encontrado no mercado.");

    const fee = Math.round(player.value * 0.10); // taxa baixa p/ free agent (MVP)
    const wage = player.wageMonthly;
    const years = 3;

    const ok = confirm(
      `Propor contrato para ${player.name}?\n\n` +
      `Taxa: ${money(fee)}\nSalário/mês: ${money(wage)}\nDuração: ${years} ano(s)\n\n` +
      `Confirmar proposta?`
    );
    if (!ok) return;

    const res = signFromMarket({
      state: s,
      player,
      fee,
      wageMonthly: wage,
      years
    });

    store.setState(res.state);
    alert(res.ok ? "Contratação concluída!" : res.reason);
    renderAll();
  }

  function renderAll() {
    renderMarket();
    renderSquad();
    renderOffers();
  }

  el.querySelector("#refresh").addEventListener("click", () => {
    const s = store.getState();
    const mk = getWeekKey();
    const market = generateMarket({ packId: s.app.selectedPackId, clubId: s.career.clubId, weekKey: mk, count: 48 });
    const next = structuredClone(s);
    next.career.transfers.marketSeed = mk;
    next.career.transfers.market = market;
    store.setState(next);
    renderAll();
    alert("Mercado atualizado.");
  });

  $pos.addEventListener("change", () => renderMarket());

  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  shell.mount(el);
  renderAll();
  return { render() {} };
}