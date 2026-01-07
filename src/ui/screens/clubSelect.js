// /src/ui/screens/clubSelect.js
function safeText(v) {
  return String(v ?? "").replace(/[<>&"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;"
  }[c]));
}

function getClubArrayFromPack(pack) {
  // Aceita variações de estrutura de pack
  const candidates = [
    pack?.content?.clubs?.clubs,
    pack?.content?.clubs,
    pack?.clubs?.clubs,
    pack?.clubs,
    pack?.content?.data?.clubs?.clubs,
    pack?.content?.data?.clubs
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

function clubId(club) {
  return club?.id || club?.code || club?.slug || club?.abbrev || club?.short || null;
}

function clubName(club) {
  return club?.name || club?.fullName || club?.title || clubId(club) || "Clube";
}

function clubCountry(club) {
  return club?.country || club?.nation || club?.pais || null;
}

function logoUrl(id) {
  // Sua regra: escudos em /assets/logos/<ID>.png
  return `./assets/logos/${encodeURIComponent(id)}.png`;
}

export async function screenClubSelect({ shell, repos, store, navigate }) {
  const state = store.getState();
  if (!state?.app?.selectedPackId) {
    navigate("#/dataPackSelect");
    return { render() {} };
  }
  if (!state?.career?.coach) {
    navigate("#/careerCreate");
    return { render() {} };
  }

  const el = document.createElement("div");
  el.className = "grid";

  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Escolha seu Clube</div>
          <div class="card__subtitle">Escudos carregam de <b>/assets/logos/&lt;ID&gt;.png</b></div>
        </div>
        <span class="badge" id="count">...</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2" style="margin-bottom:10px">
          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div class="muted" style="font-size:12px;margin-bottom:6px">Pesquisar</div>
              <input id="q" class="input" placeholder="Nome ou ID (ex: FLA, PAL)" />
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div class="muted" style="font-size:12px;margin-bottom:6px">Filtro</div>
              <select id="filter" class="select">
                <option value="all">Todos</option>
                <option value="br">Apenas Brasil</option>
              </select>
            </div>
          </div>
        </div>

        <div id="list">
          <div class="muted" style="font-size:13px;line-height:1.4">Carregando clubes...</div>
        </div>
      </div>

      <div class="card__footer">
        <button class="btn" id="back">Voltar</button>
      </div>
    </div>
  `;

  el.querySelector("#back").addEventListener("click", () => navigate("#/careerCreate"));
  shell.mount(el);

  const $count = el.querySelector("#count");
  const $list = el.querySelector("#list");
  const $q = el.querySelector("#q");
  const $filter = el.querySelector("#filter");

  let clubs = [];
  let pack = null;

  try {
    pack = await repos.loadPack(state.app.selectedPackId);
    clubs = getClubArrayFromPack(pack);

    // Normaliza (remove inválidos)
    clubs = clubs
      .map(c => ({ ...c, __id: clubId(c), __name: clubName(c), __country: clubCountry(c) }))
      .filter(c => c.__id && c.__name);

    // Ordena por nome
    clubs.sort((a, b) => String(a.__name).localeCompare(String(b.__name), "pt-BR"));

    $count.textContent = `${clubs.length} clubes`;
  } catch (err) {
    $count.textContent = "Erro";
    $list.innerHTML = `
      <div class="muted" style="font-size:13px;line-height:1.4">
        Falha ao carregar clubes do pack.<br/>
        <b>${safeText(err?.message || err)}</b>
      </div>
    `;
    return { render() {} };
  }

  function render() {
    const q = ($q.value || "").trim().toLowerCase();
    const filt = $filter.value;

    let view = clubs;

    if (filt === "br") {
      view = view.filter(c => String(c.__country || "").toLowerCase() === "brasil");
    }

    if (q) {
      view = view.filter(c =>
        String(c.__name).toLowerCase().includes(q) ||
        String(c.__id).toLowerCase().includes(q)
      );
    }

    // Proteção total: nunca slice em undefined
    const items = Array.isArray(view) ? view.slice(0, 200) : [];

    if (!items.length) {
      $list.innerHTML = `
        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div style="font-weight:900">Nenhum clube encontrado</div>
            <div class="muted" style="font-size:12px;margin-top:6px;line-height:1.35">
              Verifique o pack (clubs.json) ou ajuste o filtro/pesquisa.
            </div>
          </div>
        </div>
      `;
      $count.textContent = `0 clube(s)`;
      return;
    }

    $count.textContent = `${items.length} clube(s)`;

    $list.innerHTML = items.map(c => {
      const id = c.__id;
      const name = c.__name;
      const country = c.__country ? ` • ${safeText(c.__country)}` : "";
      const badge = safeText(id);

      return `
        <div class="card" style="border-radius:18px;margin-bottom:10px">
          <div class="card__body" style="display:flex;align-items:center;justify-content:space-between;gap:12px">
            <div style="display:flex;align-items:center;gap:12px;min-width:0">
              <img
                src="${logoUrl(id)}"
                alt="${safeText(name)}"
                style="width:46px;height:46px;border-radius:14px;object-fit:contain;background:rgba(255,255,255,.06)"
                onerror="this.style.opacity=.25;this.style.filter='grayscale(1)';"
              />
              <div style="min-width:0">
                <div style="font-weight:900;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${safeText(name)}</div>
                <div class="muted" style="font-size:12px;opacity:.85">ID: ${badge}${country}</div>
              </div>
            </div>

            <button class="btn btn--primary" data-club="${safeText(id)}">Escolher</button>
          </div>
        </div>
      `;
    }).join("");

    $list.querySelectorAll("button[data-club]").forEach(btn => {
      btn.addEventListener("click", () => {
        const club = btn.getAttribute("data-club");

        const st = store.getState();
        const next = structuredClone(st);

        next.career.clubId = club;

        store.setState(next);
        navigate("#/tutorial");
      });
    });
  }

  $q.addEventListener("input", render);
  $filter.addEventListener("change", render);

  render();
  return { render };
}