import { ensureEconomy, debit, credit } from "../../domain/economy/economy.js";
import { deriveUserSquad, rosterStats } from "../../domain/roster/rosterService.js";
import { generateMarket, filterMarket, sortMarket, estimateTransferFee } from "../../domain/transfers/market.js";

function money(n) {
  const v = Math.round(Number(n || 0));
  return v.toLocaleString("pt-BR");
}

export async function screenTransfers({ shell, repos, store, navigate }) {
  const state0 = store.getState();
  if (!state0.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!state0.career?.clubId) { navigate("#/hub"); return { render() {} }; }

  const pack = await repos.loadPack(state0.app.selectedPackId);
  store.setState(ensureEconomy(store.getState(), pack));

  const state = store.getState();
  const clubId = state.career.clubId;
  const packId = state.app.selectedPackId;

  const clubs = pack.content.clubs.clubs;
  const club = clubs.find(c => c.id === clubId);

  const marketBase = generateMarket({ packId, clubId, size: 90 });

  function getSquad() {
    return deriveUserSquad({ pack, state: store.getState() });
  }

  function getEco() {
    return store.getState().career.economy;
  }

  function saveRoster(nextRoster) {
    store.update(s => ({ ...s, career: { ...s.career, roster: nextRoster } }));
  }

  function signPlayer(player) {
    const st = store.getState();
    const eco = st.career.economy;
    const roster = st.career.roster;

    const fee = estimateTransferFee(player);
    const wage = player.wageMonthly || 0;

    if (eco.balance < fee) {
      alert("Saldo insuficiente para contratar esse jogador.");
      return;
    }

    // evita duplicar
    const already = (roster.signedPlayers || []).some(p => p.id === player.id);
    if (already) {
      alert("Esse jogador já está no seu clube (save).");
      return;
    }

    // debita taxa
    let nextState = debit(st, fee, "Compra de jogador", { playerId: player.id, name: player.name, fee });

    // adiciona ao roster (entra no elenco)
    const signedPlayers = (nextState.career.roster.signedPlayers || []).slice();
    signedPlayers.push({ ...player, clubId });

    const transactions = (nextState.career.roster.transactions || []).slice();
    transactions.unshift({
      at: new Date().toISOString(),
      type: "BUY",
      playerId: player.id,
      name: player.name,
      fee,
      wageMonthly: wage
    });

    nextState.career.roster = {
      ...nextState.career.roster,
      signedPlayers,
      transactions
    };

    store.setState(nextState);
    alert(`Contratado: ${player.name}\nTaxa: ${money(fee)}\nSalário mensal: ${money(wage)}`);
  }

  function releasePlayer(playerId) {
    const st = store.getState();
    const roster = st.career.roster;

    const releasedIds = new Set(roster.releasedIds || []);
    releasedIds.add(playerId);

    // se era contratado pelo save, remove de signedPlayers
    const signed = (roster.signedPlayers || []).filter(p => p.id !== playerId);

    const transactions = (roster.transactions || []).slice();
    transactions.unshift({
      at: new Date().toISOString(),
      type: "RELEASE",
      playerId
    });

    const nextRoster = {
      ...roster,
      releasedIds: Array.from(releasedIds),
      signedPlayers: signed,
      transactions
    };

    saveRoster(nextRoster);
    alert("Jogador dispensado do elenco (save).");
  }

  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Transferências</div>
          <div class="card__subtitle">${club?.name || clubId} • Mercado + Contratações</div>
        </div>
        <span class="badge">MVP</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2">
          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Seu clube</div>
              <div class="muted" style="font-size:12px;margin-top:6px">Saldo e folha estimada</div>
              <div style="height:10px"></div>
              <div class="item">
                <div class="item__left">
                  <div>
                    <div style="font-weight:900">Saldo</div>
                    <div class="muted" style="font-size:12px">Disponível para compras</div>
                  </div>
                </div>
                <span class="badge" id="balance">-</span>
              </div>
              <div class="item">
                <div class="item__left">
                  <div>
                    <div style="font-weight:900">Folha mensal</div>
                    <div class="muted" style="font-size:12px">Soma do elenco (MVP)</div>
                  </div>
                </div>
                <span class="badge" id="wage">-</span>
              </div>

              <div style="height:12px"></div>
              <button class="btn" id="goFinance">Ver Finanças</button>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Mercado</div>
              <div style="height:8px"></div>
              <input class="input" id="q" placeholder="Nome, posição, nacionalidade ou overall (ex: ST, 82)" />
              <div style="height:10px"></div>
              <select class="select" id="sort">
                <option value="VALUE_DESC">Valor (maior)</option>
                <option value="VALUE_ASC">Valor (menor)</option>
                <option value="OVR_DESC">Overall (maior)</option>
                <option value="OVR_ASC">Overall (menor)</option>
              </select>
              <div style="height:12px"></div>
              <div class="muted" style="font-size:12px">Toque para contratar</div>
            </div>
          </div>
        </div>

        <div style="height:12px"></div>

        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:900">Lista do Mercado</div>
                <div class="muted" style="font-size:12px">Taxa estimada e salário mensal</div>
              </div>
              <span class="badge" id="marketCount">-</span>
            </div>
            <div style="height:12px"></div>
            <div class="list" id="market"></div>
          </div>
        </div>

        <div style="height:12px"></div>

        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="font-weight:900">Seu Elenco (dispensar)</div>
                <div class="muted" style="font-size:12px">Toque para dispensar (somente no save)</div>
              </div>
              <span class="badge" id="squadCount">-</span>
            </div>
            <div style="height:12px"></div>
            <div class="list" id="squad"></div>
          </div>
        </div>

        <div style="height:12px"></div>
        <button class="btn" id="back">Voltar</button>
      </div>
    </div>
  `;

  const $balance = el.querySelector("#balance");
  const $wage = el.querySelector("#wage");
  const $q = el.querySelector("#q");
  const $sort = el.querySelector("#sort");
  const $market = el.querySelector("#market");
  const $marketCount = el.querySelector("#marketCount");
  const $squad = el.querySelector("#squad");
  const $squadCount = el.querySelector("#squadCount");

  function renderHeader() {
    const eco = getEco();
    $balance.textContent = `R$ ${money(eco.balance)}`;

    const stats = rosterStats(getSquad());
    $wage.textContent = `R$ ${money(stats.wage)}`;
  }

  function renderMarket() {
    const filtered = filterMarket(marketBase, $q.value);
    const sorted = sortMarket(filtered, $sort.value);

    $marketCount.textContent = `${sorted.length}`;

    $market.innerHTML = "";
    for (const p of sorted.slice(0, 50)) {
      const pos = (p.positions && p.positions[0]) || "-";
      const fee = estimateTransferFee(p);

      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="item__left" style="gap:10px">
          <span class="badge" style="min-width:52px;text-align:center">${pos}</span>
          <div>
            <div style="font-weight:900">${p.name}</div>
            <div class="muted" style="font-size:12px">OVR ${p.overall} • ${p.nationality} • ${p.age} anos</div>
            <div class="muted" style="font-size:12px">Taxa: R$ ${money(fee)} • Salário: R$ ${money(p.wageMonthly)}</div>
          </div>
        </div>
        <span class="badge">${p.overall}</span>
      `;
      item.addEventListener("click", () => {
        const ok = confirm(`Contratar ${p.name}?\nTaxa: R$ ${money(fee)}\nSalário mensal: R$ ${money(p.wageMonthly)}`);
        if (ok) {
          signPlayer(p);
          renderAll();
        }
      });
      $market.appendChild(item);
    }

    if ($market.children.length === 0) {
      $market.innerHTML = `
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

  function renderSquad() {
    const squad = getSquad().slice().sort((a,b)=>(b.overall-a.overall) || a.name.localeCompare(b.name,"pt-BR"));
    $squadCount.textContent = `${squad.length}`;

    $squad.innerHTML = "";
    for (const p of squad.slice(0, 40)) {
      const pos = (p.positions && p.positions[0]) || "-";
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="item__left" style="gap:10px">
          <span class="badge" style="min-width:52px;text-align:center">${pos}</span>
          <div>
            <div style="font-weight:900">${p.name}</div>
            <div class="muted" style="font-size:12px">OVR ${p.overall} • Salário: R$ ${money(p.wageMonthly || 0)} ${p.generated ? "• Gerado" : ""}</div>
          </div>
        </div>
        <span class="badge">Disp.</span>
      `;
      item.addEventListener("click", () => {
        const ok = confirm(`Dispensar ${p.name} do elenco (save)?`);
        if (ok) {
          releasePlayer(p.id);
          renderAll();
        }
      });
      $squad.appendChild(item);
    }
  }

  function renderAll() {
    renderHeader();
    renderMarket();
    renderSquad();
  }

  $q.addEventListener("input", renderMarket);
  $sort.addEventListener("change", renderMarket);

  el.querySelector("#goFinance").addEventListener("click", () => navigate("#/finance"));
  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  shell.mount(el);
  renderAll();

  return { render() {} };
}