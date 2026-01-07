// /src/ui/screens/training.js

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

const PLANS = [
  { id: "BALANCED", name: "Equilibrado" },
  { id: "FITNESS", name: "Físico" },
  { id: "TACTICAL", name: "Tático" },
  { id: "TECHNICAL", name: "Técnico" },
  { id: "RECOVERY", name: "Recuperação" }
];

const FOCUS = [
  { id: "GENERAL", name: "Geral" },
  { id: "ATTACK", name: "Ataque" },
  { id: "MIDFIELD", name: "Meio" },
  { id: "DEFENSE", name: "Defesa" },
  { id: "GOALKEEPING", name: "Goleiros" }
];

function ensureDefaults(state) {
  const next = structuredClone(state);

  if (!next.career) next.career = {};
  if (!next.career.training) next.career.training = { plan: "BALANCED", focus: "GENERAL", intensity: 60, lastAppliedIso: null };

  if (!next.career.training.plan) next.career.training.plan = "BALANCED";
  if (!next.career.training.focus) next.career.training.focus = "GENERAL";
  if (typeof next.career.training.intensity !== "number") next.career.training.intensity = 60;

  next.career.training.intensity = clamp(next.career.training.intensity, 0, 100);
  if (!("lastAppliedIso" in next.career.training)) next.career.training.lastAppliedIso = null;

  return next;
}

function nowIsoDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export async function screenTraining({ shell, store, navigate }) {
  const s0 = store.getState();
  if (!s0?.career?.clubId) { navigate("#/clubSelect"); return { render() {} }; }

  store.setState(ensureDefaults(s0));

  const el = document.createElement("div");
  el.className = "grid";

  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Treinos</div>
          <div class="card__subtitle">Defina o plano e aplique a sessão (MVP)</div>
        </div>
        <span class="badge">Training</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2" style="margin-bottom:10px">
          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div class="muted" style="font-size:12px;margin-bottom:6px">Plano</div>
              <select id="plan" class="select"></select>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div class="muted" style="font-size:12px;margin-bottom:6px">Foco</div>
              <select id="focus" class="select"></select>
            </div>
          </div>
        </div>

        <div class="card" style="border-radius:18px;margin-bottom:10px">
          <div class="card__body">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
              <div style="min-width:0">
                <div style="font-weight:900">Intensidade</div>
                <div class="muted" style="font-size:12px;opacity:.85">0 = leve • 100 = pesada (mais risco de desgaste no futuro)</div>
              </div>
              <div style="min-width:120px;text-align:right">
                <span class="badge" id="intVal">60</span>
              </div>
            </div>
            <input id="intensity" type="range" min="0" max="100" value="60" style="width:100%;margin-top:10px" />
          </div>
        </div>

        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div style="font-weight:900;margin-bottom:6px">Status do treino</div>
            <div class="muted" id="status" style="font-size:12px;line-height:1.35"></div>
          </div>
        </div>
      </div>

      <div class="card__footer" style="display:flex;gap:10px;justify-content:space-between">
        <button class="btn" id="back">Voltar</button>
        <button class="btn btn--primary" id="apply">Aplicar sessão</button>
      </div>
    </div>
  `;

  shell.mount(el);

  const $plan = el.querySelector("#plan");
  const $focus = el.querySelector("#focus");
  const $int = el.querySelector("#intensity");
  const $intVal = el.querySelector("#intVal");
  const $status = el.querySelector("#status");

  function fillSelect(sel, items, selected) {
    sel.innerHTML = items.map(it => {
      const s = it.id === selected ? "selected" : "";
      return `<option value="${safeText(it.id)}" ${s}>${safeText(it.name)}</option>`;
    }).join("");
  }

  function getStateNow() {
    return ensureDefaults(store.getState());
  }

  function render() {
    const st = getStateNow();
    const tr = st.career.training;

    fillSelect($plan, PLANS, tr.plan);
    fillSelect($focus, FOCUS, tr.focus);

    $int.value = String(tr.intensity);
    $intVal.textContent = String(tr.intensity);

    const pName = PLANS.find(x => x.id === tr.plan)?.name || tr.plan;
    const fName = FOCUS.find(x => x.id === tr.focus)?.name || tr.focus;

    const last = tr.lastAppliedIso ? `Última sessão aplicada em ${tr.lastAppliedIso}.` : "Nenhuma sessão aplicada ainda.";
    $status.textContent = `Plano: ${pName} • Foco: ${fName} • Intensidade: ${tr.intensity}. ${last}`;
  }

  function patch(mut) {
    const st = getStateNow();
    const next = structuredClone(st);
    mut(next);
    store.setState(ensureDefaults(next));
    render();
  }

  $plan.addEventListener("change", () => patch(s => { s.career.training.plan = $plan.value; }));
  $focus.addEventListener("change", () => patch(s => { s.career.training.focus = $focus.value; }));
  $int.addEventListener("input", () => {
    const v = clamp(Number($int.value), 0, 100);
    $intVal.textContent = String(v);
    patch(s => { s.career.training.intensity = v; });
  });

  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  el.querySelector("#apply").addEventListener("click", () => {
    // MVP: marca data do treino como aplicado. (Efeitos em atributos entram no próximo milestone)
    const today = nowIsoDate();
    patch(s => { s.career.training.lastAppliedIso = today; });

    alert("Sessão aplicada! (MVP) Use 'Salvar' no Hub para gravar no slot.");
  });

  render();
  return { render };
}
