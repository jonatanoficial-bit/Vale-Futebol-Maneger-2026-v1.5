import { ensurePlayerStatusState } from "../../domain/training/playerStatus.js";
import { applyWeeklyTrainingToSquad } from "../../domain/training/trainingService.js";
import { deriveUserSquad } from "../../domain/roster/rosterService.js";

function pct(n) {
  return `${Math.round(Number(n || 0))}%`;
}

export async function screenTraining({ shell, repos, store, navigate }) {
  const state0 = store.getState();
  if (!state0.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!state0.career?.clubId) { navigate("#/hub"); return { render() {} }; }

  const pack = await repos.loadPack(state0.app.selectedPackId);
  store.setState(ensurePlayerStatusState(store.getState()));

  const st = store.getState();
  const clubId = st.career.clubId;
  const clubs = pack.content.clubs.clubs;
  const club = clubs.find(c => c.id === clubId);

  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Treinos</div>
          <div class="card__subtitle">${club?.name || clubId} • Plano semanal</div>
        </div>
        <span class="badge">v0.7</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2">
          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Configurar semana</div>
              <div class="muted" style="font-size:12px;margin-top:6px;line-height:1.35">
                O treino altera Fitness, Moral, Ritmo e pode gerar lesões. Isso impacta o desempenho nas partidas.
              </div>

              <div style="height:12px"></div>

              <div style="font-weight:900">Plano</div>
              <div style="height:8px"></div>
              <select class="select" id="plan">
                <option value="LIGHT">Leve (recuperação)</option>
                <option value="BALANCED">Balanceado</option>
                <option value="INTENSE">Intenso (risco maior)</option>
              </select>

              <div style="height:12px"></div>

              <div style="font-weight:900">Foco</div>
              <div style="height:8px"></div>
              <select class="select" id="focus">
                <option value="GENERAL">Geral</option>
                <option value="PHYSICAL">Físico</option>
                <option value="TECHNICAL">Técnico</option>
                <option value="ATTACK">Ataque</option>
                <option value="DEFENSE">Defesa</option>
              </select>

              <div style="height:12px"></div>

              <button class="btn btn--primary" id="apply">Aplicar treino (semana)</button>
              <div style="height:8px"></div>
              <div class="muted" style="font-size:12px" id="lastApplied">-</div>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Resumo do elenco</div>
              <div class="muted" style="font-size:12px;margin-top:6px">Top 12 jogadores (status)</div>
              <div style="height:12px"></div>
              <div class="list" id="list"></div>
            </div>
          </div>
        </div>

        <div style="height:12px"></div>
        <button class="btn" id="back">Voltar</button>
      </div>
    </div>
  `;

  const $plan = el.querySelector("#plan");
  const $focus = el.querySelector("#focus");
  const $apply = el.querySelector("#apply");
  const $list = el.querySelector("#list");
  const $last = el.querySelector("#lastApplied");

  function readPrefs() {
    const s = store.getState();
    const t = s.career.training || {};
    $plan.value = t.plan || "BALANCED";
    $focus.value = t.focus || "GENERAL";
    $last.textContent = t.lastAppliedIso ? `Último treino: ${new Date(t.lastAppliedIso).toLocaleString("pt-BR")}` : "Nenhum treino aplicado ainda.";
  }

  function renderList() {
    const s = store.getState();
    const squad = deriveUserSquad({ pack, state: s })
      .slice()
      .sort((a, b) => (b.overall - a.overall) || a.name.localeCompare(b.name, "pt-BR"))
      .slice(0, 12);

    $list.innerHTML = "";
    for (const p of squad) {
      const stt = p.status || { fitness: 0, morale: 0, sharpness: 0, injuryDays: 0 };
      const item = document.createElement("div");
      item.className = "item";
      item.innerHTML = `
        <div class="item__left">
          <div>
            <div style="font-weight:900">${p.name} <span class="muted" style="font-weight:700">(${(p.positions && p.positions[0]) || "-"})</span></div>
            <div class="muted" style="font-size:12px;line-height:1.35">
              Fitness ${pct(stt.fitness)} • Moral ${pct(stt.morale)} • Ritmo ${pct(stt.sharpness)}
              ${stt.injuryDays > 0 ? `• Lesão: ${stt.injuryDays}d` : ""}
            </div>
          </div>
        </div>
        <span class="badge">OVR ${p.overall}</span>
      `;
      $list.appendChild(item);
    }
  }

  $apply.addEventListener("click", async () => {
    const s0 = store.getState();
    const squad = deriveUserSquad({ pack, state: s0 });

    // weekKey determinístico (baseado na data atual + clube + pack)
    const weekKey = `${s0.app.selectedPackId}::${s0.career.clubId}::${new Date().toISOString().slice(0, 10)}`;

    const next = applyWeeklyTrainingToSquad({
      state: s0,
      squad,
      plan: $plan.value,
      focus: $focus.value,
      weekKey
    });

    store.setState(next);
    readPrefs();
    renderList();
    alert("Treino aplicado! Isso impacta suas próximas partidas.");
  });

  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  shell.mount(el);
  readPrefs();
  renderList();

  return { render() {} };
}