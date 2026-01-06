import { formationById, FORMATIONS } from "../../domain/tactics/formations.js";
import {
  ensureLineup,
  autoPickLineup,
  validateLineup
} from "../../domain/tactics/lineupService.js";
import { deriveUserSquad } from "../../domain/roster/rosterService.js";

function opt(label, value, selected) {
  return `<option value="${value}" ${selected ? "selected" : ""}>${label}</option>`;
}

function playerLabel(p) {
  const pos = (p.positions && p.positions[0]) ? p.positions[0] : "-";
  return `${p.name} • ${pos} • OVR ${p.overall}`;
}

export async function screenTactics({ shell, repos, store, navigate }) {
  const state0 = store.getState();
  if (!state0.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!state0.career?.clubId) { navigate("#/hub"); return { render() {} }; }

  const pack = await repos.loadPack(state0.app.selectedPackId);
  store.setState(ensureLineup(store.getState()));

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
          <div class="card__title">Tática</div>
          <div class="card__subtitle">${club?.name || clubId} • Escalação 11 + 7</div>
        </div>
        <span class="badge">v0.8</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2">

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Filosofia</div>
              <div style="height:8px"></div>

              <div style="font-weight:900">Estilo</div>
              <div style="height:6px"></div>
              <select class="select" id="style">
                <option value="DEFENSIVE">Defensivo</option>
                <option value="BALANCED">Balanceado</option>
                <option value="ATTACKING">Ofensivo</option>
              </select>

              <div style="height:10px"></div>

              <div style="font-weight:900">Pressão</div>
              <div style="height:6px"></div>
              <select class="select" id="pressing">
                <option value="LOW">Baixa</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">Alta</option>
              </select>

              <div style="height:10px"></div>

              <div style="font-weight:900">Ritmo</div>
              <div style="height:6px"></div>
              <select class="select" id="tempo">
                <option value="SLOW">Lento</option>
                <option value="NORMAL">Normal</option>
                <option value="FAST">Rápido</option>
              </select>

              <div style="height:14px"></div>

              <div style="font-weight:900">Formação</div>
              <div style="height:6px"></div>
              <select class="select" id="formation"></select>

              <div style="height:12px"></div>
              <div class="grid grid--2">
                <button class="btn" id="autopick">Auto-escalar</button>
                <button class="btn btn--primary" id="save">Salvar</button>
              </div>

              <div style="height:10px"></div>
              <div class="muted" style="font-size:12px;line-height:1.35" id="validation"></div>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Titulares</div>
              <div class="muted" style="font-size:12px;margin-top:6px">Fora de posição gera penalidade no desempenho.</div>
              <div style="height:10px"></div>
              <div class="list" id="starters"></div>

              <div style="height:14px"></div>
              <div style="font-weight:900">Banco (7)</div>
              <div style="height:10px"></div>
              <div class="list" id="bench"></div>
            </div>
          </div>

        </div>

        <div style="height:12px"></div>
        <button class="btn" id="back">Voltar</button>
      </div>
    </div>
  `;

  const $formation = el.querySelector("#formation");
  const $style = el.querySelector("#style");
  const $pressing = el.querySelector("#pressing");
  const $tempo = el.querySelector("#tempo");
  const $starters = el.querySelector("#starters");
  const $bench = el.querySelector("#bench");
  const $validation = el.querySelector("#validation");

  // elenco (gerado/pack) já vem com status no rosterService
  function getSquad() {
    return deriveUserSquad({ pack, state: store.getState() });
  }

  function fillFormationOptions() {
    const current = store.getState().career.lineup.formationId;
    $formation.innerHTML = FORMATIONS.map(f => opt(f.name, f.id, f.id === current)).join("");
  }

  function syncTacticsSelects() {
    const t = store.getState().career.tactics || {};
    $style.value = t.style || "BALANCED";
    $pressing.value = t.pressing || "NORMAL";
    $tempo.value = t.tempo || "NORMAL";
  }

  function makePlayerSelect({ squad, selectedId, onChange }) {
    const sel = document.createElement("select");
    sel.className = "select";
    const options = [opt("— vazio —", "", !selectedId)]
      .concat(squad.map(p => opt(playerLabel(p), p.id, p.id === selectedId)));
    sel.innerHTML = options.join("");
    sel.addEventListener("change", () => onChange(sel.value || null));
    return sel;
  }

  function renderAll() {
    const s = store.getState();
    const lineup = s.career.lineup;
    const tactics = s.career.tactics || {};
    const squad = getSquad();
    const squadById = new Map(squad.map(p => [p.id, p]));
    const f = formationById(lineup.formationId);

    // validação
    const val = validateLineup({ formationId: lineup.formationId, squadById, lineup });
    $validation.textContent = val.ok
      ? "OK: escalação válida."
      : `Ajustes necessários:\n• ${val.issues.join("\n• ")}`;

    // titulares
    $starters.innerHTML = "";
    for (const role of f.roles) {
      const card = document.createElement("div");
      card.className = "item";
      const currentId = lineup.starters[role.key] || "";

      const left = document.createElement("div");
      left.className = "item__left";
      left.innerHTML = `
        <div>
          <div style="font-weight:900">${role.label} <span class="muted" style="font-weight:700">(${role.key})</span></div>
          <div class="muted" style="font-size:12px">Permitido: ${role.allowed.join(", ")}</div>
        </div>
      `;

      const right = document.createElement("div");
      right.style.minWidth = "260px";
      right.appendChild(
        makePlayerSelect({
          squad,
          selectedId: currentId,
          onChange: (pid) => {
            const next = structuredClone(store.getState());
            next.career.lineup.starters[role.key] = pid || null;
            store.setState(next);
            renderAll();
          }
        })
      );

      card.appendChild(left);
      card.appendChild(right);
      $starters.appendChild(card);
    }

    // banco
    $bench.innerHTML = "";
    const benchSize = f.benchSize;
    for (let i = 0; i < benchSize; i++) {
      const card = document.createElement("div");
      card.className = "item";

      const left = document.createElement("div");
      left.className = "item__left";
      left.innerHTML = `
        <div>
          <div style="font-weight:900">Banco ${i + 1}</div>
          <div class="muted" style="font-size:12px">Recomendado: 1 GK, 2 DEF, 2 MID, 2 ATA</div>
        </div>
      `;

      const currentId = (lineup.bench[i] || "");
      const right = document.createElement("div");
      right.style.minWidth = "260px";
      right.appendChild(
        makePlayerSelect({
          squad,
          selectedId: currentId,
          onChange: (pid) => {
            const next = structuredClone(store.getState());
            const b = next.career.lineup.bench.slice();
            b[i] = pid || null;
            next.career.lineup.bench = b;
            store.setState(next);
            renderAll();
          }
        })
      );

      card.appendChild(left);
      card.appendChild(right);
      $bench.appendChild(card);
    }

    // sincroniza selects de filosofia
    syncTacticsSelects();
  }

  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  $formation.addEventListener("change", () => {
    const next = structuredClone(store.getState());
    next.career.lineup.formationId = $formation.value;
    // reseta titulares/banco ao trocar formação (evita lixo e duplicação)
    next.career.lineup.starters = {};
    next.career.lineup.bench = [];
    store.setState(next);
    renderAll();
  });

  $style.addEventListener("change", () => {
    const next = structuredClone(store.getState());
    next.career.tactics.style = $style.value;
    store.setState(next);
  });
  $pressing.addEventListener("change", () => {
    const next = structuredClone(store.getState());
    next.career.tactics.pressing = $pressing.value;
    store.setState(next);
  });
  $tempo.addEventListener("change", () => {
    const next = structuredClone(store.getState());
    next.career.tactics.tempo = $tempo.value;
    store.setState(next);
  });

  el.querySelector("#autopick").addEventListener("click", () => {
    const squad = getSquad();
    const nextLineup = autoPickLineup({ formationId: store.getState().career.lineup.formationId, squad });
    const next = structuredClone(store.getState());
    next.career.lineup = { ...next.career.lineup, ...nextLineup };
    store.setState(next);
    renderAll();
    alert("Auto-escalar aplicado.");
  });

  el.querySelector("#save").addEventListener("click", () => {
    repos.saves.writeSlot(store.getState().career.slot, store.getState());
    alert("Tática salva.");
  });

  fillFormationOptions();
  shell.mount(el);
  renderAll();

  return { render() {} };
}