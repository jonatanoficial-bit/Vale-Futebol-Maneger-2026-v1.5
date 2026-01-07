// /src/ui/screens/tactics.js

function safeText(v) {
  return String(v ?? "").replace(/[<>&"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;"
  }[c]));
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

const FORMATIONS = [
  { id: "4-3-3", name: "4-3-3 (Ofensivo)" },
  { id: "4-2-3-1", name: "4-2-3-1 (Equilibrado)" },
  { id: "4-4-2", name: "4-4-2 (Clássico)" },
  { id: "3-5-2", name: "3-5-2 (Meio forte)" },
  { id: "5-3-2", name: "5-3-2 (Defensivo)" }
];

const STYLE = [
  { id: "BALANCED", name: "Equilibrado" },
  { id: "POSSESSION", name: "Posse" },
  { id: "COUNTER", name: "Contra-ataque" },
  { id: "HIGH_PRESS", name: "Pressão Alta" }
];

const PRESSING = [
  { id: "LOW", name: "Baixa" },
  { id: "NORMAL", name: "Normal" },
  { id: "HIGH", name: "Alta" }
];

const TEMPO = [
  { id: "SLOW", name: "Lento" },
  { id: "NORMAL", name: "Normal" },
  { id: "FAST", name: "Rápido" }
];

function ensureCareerDefaults(state) {
  const next = structuredClone(state);

  if (!next.career) next.career = {};
  if (!next.career.lineup) next.career.lineup = { formationId: "4-3-3", starters: {}, bench: [] };
  if (!next.career.lineup.formationId) next.career.lineup.formationId = "4-3-3";

  if (!next.career.tactics) next.career.tactics = { style: "BALANCED", pressing: "NORMAL", tempo: "NORMAL", width: 50, depth: 50 };
  if (!next.career.tactics.style) next.career.tactics.style = "BALANCED";
  if (!next.career.tactics.pressing) next.career.tactics.pressing = "NORMAL";
  if (!next.career.tactics.tempo) next.career.tactics.tempo = "NORMAL";
  if (typeof next.career.tactics.width !== "number") next.career.tactics.width = 50;
  if (typeof next.career.tactics.depth !== "number") next.career.tactics.depth = 50;

  next.career.tactics.width = clamp(next.career.tactics.width, 0, 100);
  next.career.tactics.depth = clamp(next.career.tactics.depth, 0, 100);

  return next;
}

export async function screenTactics({ shell, store, navigate }) {
  // Guard rails de fluxo
  const state0 = store.getState();
  if (!state0?.career?.clubId) { navigate("#/clubSelect"); return { render() {} }; }

  // garante defaults
  store.setState(ensureCareerDefaults(state0));

  const el = document.createElement("div");
  el.className = "grid";

  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Tática</div>
          <div class="card__subtitle">Ajuste formação e estilo do time (MVP)</div>
        </div>
        <span class="badge">Tactics</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2" style="margin-bottom:10px">
          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div class="muted" style="font-size:12px;margin-bottom:6px">Formação</div>
              <select id="formation" class="select"></select>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div class="muted" style="font-size:12px;margin-bottom:6px">Estilo</div>
              <select id="style" class="select"></select>
            </div>
          </div>
        </div>

        <div class="grid grid--2" style="margin-bottom:10px">
          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div class="muted" style="font-size:12px;margin-bottom:6px">Pressão</div>
              <select id="pressing" class="select"></select>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div class="muted" style="font-size:12px;margin-bottom:6px">Velocidade</div>
              <select id="tempo" class="select"></select>
            </div>
          </div>
        </div>

        <div class="card" style="border-radius:18px;margin-bottom:10px">
          <div class="card__body">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
              <div style="min-width:0">
                <div style="font-weight:900">Largura do time</div>
                <div class="muted" style="font-size:12px;opacity:.85">0 = fechado • 100 = bem aberto</div>
              </div>
              <div style="min-width:120px;text-align:right">
                <span class="badge" id="widthVal">50</span>
              </div>
            </div>
            <input id="width" type="range" min="0" max="100" value="50" style="width:100%;margin-top:10px" />
          </div>
        </div>

        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
              <div style="min-width:0">
                <div style="font-weight:900">Altura da linha</div>
                <div class="muted" style="font-size:12px;opacity:.85">0 = recuado • 100 = avançado</div>
              </div>
              <div style="min-width:120px;text-align:right">
                <span class="badge" id="depthVal">50</span>
              </div>
            </div>
            <input id="depth" type="range" min="0" max="100" value="50" style="width:100%;margin-top:10px" />
          </div>
        </div>

        <div style="height:10px"></div>

        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div style="font-weight:900;margin-bottom:6px">Resumo</div>
            <div class="muted" id="summary" style="font-size:12px;line-height:1.35"></div>
          </div>
        </div>
      </div>

      <div class="card__footer" style="display:flex;gap:10px;justify-content:space-between">
        <button class="btn" id="back">Voltar</button>
        <button class="btn btn--primary" id="save">Salvar</button>
      </div>
    </div>
  `;

  shell.mount(el);

  const $formation = el.querySelector("#formation");
  const $style = el.querySelector("#style");
  const $pressing = el.querySelector("#pressing");
  const $tempo = el.querySelector("#tempo");
  const $width = el.querySelector("#width");
  const $depth = el.querySelector("#depth");
  const $widthVal = el.querySelector("#widthVal");
  const $depthVal = el.querySelector("#depthVal");
  const $summary = el.querySelector("#summary");

  function fillSelect(selectEl, items, selectedId) {
    selectEl.innerHTML = items.map(it => {
      const sel = it.id === selectedId ? "selected" : "";
      return `<option value="${safeText(it.id)}" ${sel}>${safeText(it.name)}</option>`;
    }).join("");
  }

  function getStateNow() {
    return ensureCareerDefaults(store.getState());
  }

  function renderFromState() {
    const st = getStateNow();
    const formationId = st.career.lineup.formationId;
    const tactics = st.career.tactics;

    fillSelect($formation, FORMATIONS, formationId);
    fillSelect($style, STYLE, tactics.style);
    fillSelect($pressing, PRESSING, tactics.pressing);
    fillSelect($tempo, TEMPO, tactics.tempo);

    $width.value = String(tactics.width);
    $depth.value = String(tactics.depth);
    $widthVal.textContent = String(tactics.width);
    $depthVal.textContent = String(tactics.depth);

    const fName = FORMATIONS.find(f => f.id === formationId)?.name || formationId;
    const sName = STYLE.find(x => x.id === tactics.style)?.name || tactics.style;
    const pName = PRESSING.find(x => x.id === tactics.pressing)?.name || tactics.pressing;
    const tName = TEMPO.find(x => x.id === tactics.tempo)?.name || tactics.tempo;

    $summary.textContent =
      `Formação: ${fName} • Estilo: ${sName} • Pressão: ${pName} • Velocidade: ${tName} • Largura: ${tactics.width} • Linha: ${tactics.depth}`;
  }

  function patchState(mutator) {
    const st = getStateNow();
    const next = structuredClone(st);
    mutator(next);
    store.setState(ensureCareerDefaults(next));
    renderFromState();
  }

  $formation.addEventListener("change", () => {
    patchState((s) => { s.career.lineup.formationId = $formation.value; });
  });

  $style.addEventListener("change", () => {
    patchState((s) => { s.career.tactics.style = $style.value; });
  });

  $pressing.addEventListener("change", () => {
    patchState((s) => { s.career.tactics.pressing = $pressing.value; });
  });

  $tempo.addEventListener("change", () => {
    patchState((s) => { s.career.tactics.tempo = $tempo.value; });
  });

  $width.addEventListener("input", () => {
    const v = clamp(Number($width.value), 0, 100);
    $widthVal.textContent = String(v);
    patchState((s) => { s.career.tactics.width = v; });
  });

  $depth.addEventListener("input", () => {
    const v = clamp(Number($depth.value), 0, 100);
    $depthVal.textContent = String(v);
    patchState((s) => { s.career.tactics.depth = v; });
  });

  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  el.querySelector("#save").addEventListener("click", () => {
    // aqui só salva no state (persistência fica no botão salvar do hub)
    alert("Tática salva no seu progresso. Use 'Salvar' no Hub para gravar no slot.");
    navigate("#/hub");
  });

  renderFromState();
  return { render: renderFromState };
}
