import { ensureEconomy } from "../../domain/economy/economy.js";
import { deriveUserSquad, rosterStats } from "../../domain/roster/rosterService.js";

function money(n) {
  const v = Math.round(Number(n || 0));
  return v.toLocaleString("pt-BR");
}

function fmtIso(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

export async function screenFinance({ shell, repos, store, navigate }) {
  const state0 = store.getState();
  if (!state0.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!state0.career?.clubId) { navigate("#/hub"); return { render() {} }; }

  const pack = await repos.loadPack(state0.app.selectedPackId);
  store.setState(ensureEconomy(store.getState(), pack));

  const state = store.getState();
  const clubId = state.career.clubId;

  const clubs = pack.content.clubs.clubs;
  const club = clubs.find(c => c.id === clubId);

  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Finanças</div>
          <div class="card__subtitle">${club?.name || clubId} • Controle financeiro</div>
        </div>
        <span class="badge">MVP</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2">
          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Resumo</div>
              <div style="height:10px"></div>

              <div class="item">
                <div class="item__left"><div><div style="font-weight:900">Saldo</div><div class="muted" style="font-size:12px">Caixa do clube</div></div></div>
                <span class="badge" id="balance">-</span>
              </div>

              <div class="item">
                <div class="item__left"><div><div style="font-weight:900">Patrocínio</div><div class="muted" style="font-size:12px">Receita mensal</div></div></div>
                <span class="badge" id="sponsor">-</span>
              </div>

              <div class="item">
                <div class="item__left"><div><div style="font-weight:900">Folha mensal</div><div class="muted" style="font-size:12px">Elenco atual (MVP)</div></div></div>
                <span class="badge" id="wage">-</span>
              </div>

              <div class="item">
                <div class="item__left"><div><div style="font-weight:900">Última renda de jogo</div><div class="muted" style="font-size:12px">Última partida jogada</div></div></div>
                <span class="badge" id="lastMatchIncome">-</span>
              </div>

              <div style="height:12px"></div>
              <button class="btn" id="goTransfers">Ir para Transferências</button>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Diretrizes</div>
              <div class="muted" style="font-size:12px;margin-top:6px;line-height:1.35">
                • Patrocínio entra quando vira o mês no calendário (ao jogar partidas).<br/>
                • Receita de jogo entra quando você participa da partida.<br/>
                • Compras e dispensas são salvas no slot (não alteram o pack).
              </div>
            </div>
          </div>
        </div>

        <div style="height:12px"></div>

        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:900">Extrato</div>
                <div class="muted" style="font-size:12px">Últimas movimentações</div>
              </div>
              <span class="badge" id="ledgerCount">-</span>
            </div>
            <div style="height:12px"></div>
            <div class="list" id="ledger"></div>
          </div>
        </div>

        <div style="height:12px"></div>
        <button class="btn" id="back">Voltar</button>
      </div>
    </div>
  `;

  const $balance = el.querySelector("#balance");
  const $sponsor = el.querySelector("#sponsor");
  const $wage = el.querySelector("#wage");
  const $lastMatchIncome = el.querySelector("#lastMatchIncome");
  const $ledger = el.querySelector("#ledger");
  const $ledgerCount = el.querySelector("#ledgerCount");

  function render() {
    const st = store.getState();
    const eco = st.career.economy;

    $balance.textContent = `R$ ${money(eco.balance)}`;
    $sponsor.textContent = `R$ ${money(eco.sponsor?.monthly || 0)}/m`;
    $lastMatchIncome.textContent = `R$ ${money(eco.lastMatchIncome || 0)}`;

    const squad = deriveUserSquad({ pack, state: st });
    const stats = rosterStats(squad);
    $wage.textContent = `R$ ${money(stats.wage)}`;

    const entries = eco.ledger || [];
    $ledgerCount.textContent = `${entries.length}`;

    $ledger.innerHTML = "";
    for (const e of entries.slice(0, 40)) {
      const sign = e.type === "DEBIT" ? "-" : "+";
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="item__left">
          <div>
            <div style="font-weight:900">${e.reason}</div>
            <div class="muted" style="font-size:12px">${fmtIso(e.at)}</div>
          </div>
        </div>
        <span class="badge">${sign} R$ ${money(e.amount)}</span>
      `;
      $ledger.appendChild(item);
    }

    if ($ledger.children.length === 0) {
      $ledger.innerHTML = `
        <div class="item">
          <div class="item__left">
            <div>
              <div style="font-weight:900">Sem movimentações ainda</div>
              <div class="muted" style="font-size:12px">Jogue partidas ou faça contratações.</div>
            </div>
          </div>
          <span class="badge">0</span>
        </div>
      `;
    }
  }

  el.querySelector("#goTransfers").addEventListener("click", () => navigate("#/transfers"));
  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  shell.mount(el);
  render();

  return { render };
}