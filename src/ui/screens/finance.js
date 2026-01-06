import { ensureEconomyState } from "../../domain/economy/sponsorService.js";
import { deriveUserSquad } from "../../domain/roster/rosterService.js";
import { estimateMonthlyWageBill } from "../../domain/transfers/transferService.js";

function money(n) {
  const v = Number(n || 0);
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export async function screenFinance({ shell, repos, store, navigate }) {
  const s0 = store.getState();
  if (!s0.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!s0.career?.clubId) { navigate("#/hub"); return { render() {} }; }

  const pack = await repos.loadPack(s0.app.selectedPackId);
  store.setState(ensureEconomyState(store.getState()));

  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Finanças</div>
          <div class="card__subtitle">Saldo, Patrocínio e Extrato</div>
        </div>
        <span class="badge">v1.0</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2">
          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Resumo</div>
              <div style="height:10px"></div>
              <div id="summary" class="muted" style="font-size:13px;line-height:1.5">-</div>

              <div style="height:12px"></div>
              <div style="font-weight:900">Patrocínio</div>
              <div style="height:8px"></div>
              <div id="sponsor" class="muted" style="font-size:13px;line-height:1.5">-</div>

              <div style="height:12px"></div>
              <button class="btn" id="back">Voltar</button>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Extrato (últimos lançamentos)</div>
              <div style="height:10px"></div>
              <div class="list" id="ledger"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const $summary = el.querySelector("#summary");
  const $sponsor = el.querySelector("#sponsor");
  const $ledger = el.querySelector("#ledger");

  function render() {
    const s = store.getState();
    const e = s.career.economy;

    const squad = deriveUserSquad({ pack, state: s });
    const wageBill = estimateMonthlyWageBill({ state: s, derivedSquad: squad });

    $summary.innerHTML = `
      <div><span class="muted">Saldo:</span> <span style="font-weight:900">${money(e.balance)}</span></div>
      <div><span class="muted">Folha estimada/mês:</span> <span style="font-weight:900">${money(wageBill)}</span></div>
      <div><span class="muted">Última renda jogo:</span> <span style="font-weight:900">${money(e.lastMatchIncome || 0)}</span></div>
    `;

    $sponsor.innerHTML = `
      <div><span class="muted">Empresa:</span> <span style="font-weight:900">${e.sponsor?.name || "-"}</span></div>
      <div><span class="muted">Mensal:</span> <span style="font-weight:900">${money(e.sponsor?.monthly || 0)}</span></div>
      <div><span class="muted">Bônus performance:</span> <span style="font-weight:900">${money(e.sponsor?.perfBonus || 0)}</span></div>
    `;

    const ledger = (e.ledger || []).slice(0, 18);
    $ledger.innerHTML = "";
    if (ledger.length === 0) {
      $ledger.innerHTML = `<div class="muted" style="font-size:12px">Sem lançamentos ainda.</div>`;
      return;
    }
    for (const item of ledger) {
      const row = document.createElement("div");
      row.className = "item";
      row.innerHTML = `
        <div class="item__left">
          <div style="font-weight:900">${item.label || item.type}</div>
          <div class="muted" style="font-size:12px">${new Date(item.at).toLocaleString("pt-BR")}</div>
        </div>
        <span class="badge">${money(item.amount)}</span>
      `;
      $ledger.appendChild(row);
    }
  }

  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  shell.mount(el);
  render();
  return { render };
}