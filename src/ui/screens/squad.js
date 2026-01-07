// /src/ui/screens/squad.js

function safeText(v) {
  return String(v ?? "").replace(/[<>&"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;"
  }[c]));
}

function getPlayersArray(pack) {
  const candidates = [
    pack?.content?.players?.players,
    pack?.content?.players,
    pack?.players?.players,
    pack?.players,
    pack?.content?.data?.players?.players,
    pack?.content?.data?.players
  ];
  for (const p of candidates) if (Array.isArray(p)) return p;
  return [];
}

function playerClubId(player) {
  return player?.clubId || player?.club || player?.team || null;
}

function playerName(player) {
  return player?.name || player?.fullName || "Jogador";
}

function playerPos(player) {
  return player?.position || player?.pos || "-";
}

function playerOvr(player) {
  return Number(player?.overall ?? player?.ovr ?? 0);
}

export async function screenSquad({ shell, repos, store, navigate }) {
  const state = store.getState();

  // Guard rails
  if (!state?.app?.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!state?.career?.clubId) { navigate("#/clubSelect"); return { render() {} }; }

  const el = document.createElement("div");
  el.className = "grid";

  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Elenco</div>
          <div class="card__subtitle" id="subtitle">Carregando jogadores...</div>
        </div>
        <span class="badge">Squad</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2" style="margin-bottom:10px">
          <input id="q" class="input" placeholder="Buscar nome ou posição" />
          <select id="order" class="select">
            <option value="ovr">Overall (maior)</option>
            <option value="name">Nome (A–Z)</option>
            <option value="pos">Posição</option>
          </select>
        </div>

        <div id="list">
          <div class="muted">Carregando elenco...</div>
        </div>
      </div>

      <div class="card__footer">
        <button class="btn" id="back">Voltar</button>
      </div>
    </div>
  `;

  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));
  shell.mount(el);

  const $list = el.querySelector("#list");
  const $subtitle = el.querySelector("#subtitle");
  const $q = el.querySelector("#q");
  const $order = el.querySelector("#order");

  let players = [];

  try {
    const pack = await repos.loadPack(state.app.selectedPackId);
    const allPlayers = getPlayersArray(pack);

    // Filtra apenas jogadores do clube atual
    players = allPlayers.filter(p => playerClubId(p) === state.career.clubId);

    $subtitle.textContent = `${players.length} jogador(es)`;
  } catch (err) {
    $subtitle.textContent = "Erro ao carregar elenco";
    $list.innerHTML = `
      <div class="muted">
        Falha ao carregar jogadores.<br/>
        <b>${safeText(err?.message || err)}</b>
      </div>
    `;
    return { render() {} };
  }

  function render() {
    let view = Array.isArray(players) ? [...players] : [];

    const q = ($q.value || "").toLowerCase();
    if (q) {
      view = view.filter(p =>
        playerName(p).toLowerCase().includes(q) ||
        playerPos(p).toLowerCase().includes(q)
      );
    }

    switch ($order.value) {
      case "name":
        view.sort((a, b) => playerName(a).localeCompare(playerName(b), "pt-BR"));
        break;
      case "pos":
        view.sort((a, b) => playerPos(a).localeCompare(playerPos(b), "pt-BR"));
        break;
      default:
        view.sort((a, b) => playerOvr(b) - playerOvr(a));
    }

    if (!view.length) {
      $list.innerHTML = `
        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div style="font-weight:900">Nenhum jogador encontrado</div>
            <div class="muted" style="font-size:12px;margin-top:6px">
              Este clube ainda não possui jogadores no pack atual.
            </div>
          </div>
        </div>
      `;
      return;
    }

    $list.innerHTML = view.map(p => `
      <div class="card" style="border-radius:18px;margin-bottom:8px">
        <div class="card__body" style="display:flex;justify-content:space-between;align-items:center">
          <div>
            <div style="font-weight:900">${safeText(playerName(p))}</div>
            <div class="muted" style="font-size:12px">
              ${safeText(playerPos(p))} • OVR ${playerOvr(p)}
            </div>
          </div>
        </div>
      </div>
    `).join("");
  }

  $q.addEventListener("input", render);
  $order.addEventListener("change", render);

  render();
  return { render };
}
