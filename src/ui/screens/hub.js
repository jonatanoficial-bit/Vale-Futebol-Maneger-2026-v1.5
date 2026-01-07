// /src/ui/screens/hub.js

function safeText(v) {
  return String(v ?? "").replace(/[<>&"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;"
  }[c]));
}

export async function screenHub({ shell, store, navigate }) {
  const st = store.getState();
  if (!st?.career?.clubId) { navigate("#/clubSelect"); return { render() {} }; }

  const club = st.career.clubId;
  const coach = st.career.coach?.name || "Treinador";

  const el = document.createElement("div");
  el.className = "grid";

  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div style="display:flex;align-items:center;gap:10px;min-width:0">
          <div class="logoBox">
            <img alt="${safeText(club)}" src="assets/logos/${safeText(club)}.png" onerror="this.style.opacity=.2" />
          </div>
          <div style="min-width:0">
            <div class="card__title">${safeText(club)}</div>
            <div class="card__subtitle">Treinador: ${safeText(coach)}</div>
          </div>
        </div>
        <span class="badge">Hub</span>
      </div>

      <div class="card__body">
        <button class="btn btn--block" id="squad">Elenco</button>
        <button class="btn btn--block" id="tactics">Tática</button>
        <button class="btn btn--block" id="training">Treinos</button>

        <button class="btn btn--block" id="calendar">Jogos (Calendário)</button>
        <button class="btn btn--block" id="competitions">Competições</button>

        <button class="btn btn--block" id="transfers">Transferências (em breve)</button>
        <button class="btn btn--block" id="finance">Finanças</button>

        <div style="height:10px"></div>

        <div class="card" style="border-radius:18px">
          <div class="card__body" style="display:flex;justify-content:space-between;align-items:center;gap:12px">
            <div>
              <div style="font-weight:900">Salvar progresso</div>
              <div class="muted" style="font-size:12px">Slot ${safeText(st.app?.slotId ?? "—")}</div>
            </div>
            <button class="btn btn--primary" id="save">Salvar</button>
          </div>
        </div>

        <div style="height:8px"></div>
        <button class="btn btn--block" id="exit">Sair para o menu</button>
      </div>
    </div>
  `;

  shell.mount(el);

  el.querySelector("#squad").addEventListener("click", () => navigate("#/squad"));
  el.querySelector("#tactics").addEventListener("click", () => navigate("#/tactics"));
  el.querySelector("#training").addEventListener("click", () => navigate("#/training"));

  el.querySelector("#calendar").addEventListener("click", () => navigate("#/calendar"));
  el.querySelector("#competitions").addEventListener("click", () => navigate("#/competitions"));

  el.querySelector("#transfers").addEventListener("click", () => alert("Em breve."));
  el.querySelector("#finance").addEventListener("click", () => navigate("#/finance"));

  el.querySelector("#exit").addEventListener("click", () => navigate("#/menu"));

  el.querySelector("#save").addEventListener("click", () => {
    alert("Salvar no slot é feito pelo fluxo de slots (MVP). Se quiser, eu evoluo para salvar automático aqui no próximo milestone.");
  });

  return { render() {} };
}
