// /src/ui/screens/hub.js
function safeText(v) {
  return String(v ?? "").replace(/[<>&"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;"
  }[c]));
}

function getClubsArray(pack) {
  const candidates = [
    pack?.content?.clubs?.clubs,
    pack?.content?.clubs,
    pack?.clubs?.clubs,
    pack?.clubs,
    pack?.content?.data?.clubs?.clubs,
    pack?.content?.data?.clubs
  ];
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [];
}

function getClubById(pack, id) {
  const clubs = getClubsArray(pack);
  if (!id) return null;
  return clubs.find(c => (c?.id || c?.code || c?.slug) === id) || null;
}

function clubName(club, fallbackId) {
  return club?.name || club?.fullName || club?.title || fallbackId || "Clube";
}

function logoUrl(id) {
  return `./assets/logos/${encodeURIComponent(id)}.png`;
}

export async function screenHub({ shell, repos, store, navigate }) {
  const state = store.getState();

  // Guard rails do fluxo
  if (!state?.app?.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }
  if (!state?.career?.slot) { navigate("#/saveSlots"); return { render() {} }; }
  if (!state?.career?.coach) { navigate("#/careerCreate"); return { render() {} }; }
  if (!state?.career?.clubId) { navigate("#/clubSelect"); return { render() {} }; }

  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div style="display:flex;align-items:center;gap:12px;min-width:0">
          <img id="logo" alt="Logo" style="width:44px;height:44px;border-radius:14px;object-fit:contain;background:rgba(255,255,255,.06)" />
          <div style="min-width:0">
            <div class="card__title" id="clubName">Carregando...</div>
            <div class="card__subtitle" id="sub">Treinador: -</div>
          </div>
        </div>
        <span class="badge" id="badge">Hub</span>
      </div>

      <div class="card__body">
        <button class="btn" id="squad">Elenco</button>
        <button class="btn" id="tactics">Tática</button>
        <button class="btn" id="training">Treinos</button>
        <button class="btn" id="competitions">Competições</button>
        <button class="btn" id="transfers">Transferências (em breve)</button>
        <button class="btn" id="finance">Finanças</button>

        <div style="height:10px"></div>

        <div class="card" style="border-radius:18px">
          <div class="card__body" style="display:flex;align-items:center;justify-content:space-between;gap:12px">
            <div style="min-width:0">
              <div style="font-weight:900">Salvar progresso</div>
              <div class="muted" style="font-size:12px;opacity:.85">Slot <span id="slot">-</span></div>
            </div>
            <button class="btn btn--primary" id="save">Salvar</button>
          </div>
        </div>

        <div style="height:10px"></div>

        <button class="btn" id="exit">Sair para o menu</button>
      </div>
    </div>
  `;

  shell.mount(el);

  const $clubName = el.querySelector("#clubName");
  const $sub = el.querySelector("#sub");
  const $logo = el.querySelector("#logo");
  const $slot = el.querySelector("#slot");

  // Botões / rotas
  el.querySelector("#squad").addEventListener("click", () => navigate("#/squad"));
  el.querySelector("#tactics").addEventListener("click", () => navigate("#/tactics"));
  el.querySelector("#training").addEventListener("click", () => navigate("#/training"));
  el.querySelector("#competitions").addEventListener("click", () => navigate("#/competitions"));

  el.querySelector("#transfers").addEventListener("click", () => {
    alert("Transferências entra no próximo milestone (base já está preparada).");
  });

  el.querySelector("#finance").addEventListener("click", () => navigate("#/finance"));

  el.querySelector("#save").addEventListener("click", async () => {
    try {
      const st = store.getState();
      await repos.saves.saveSlot(st.career.slot, st);
      alert("Progresso salvo!");
    } catch (err) {
      alert(`Falha ao salvar: ${err?.message || err}`);
    }
  });

  el.querySelector("#exit").addEventListener("click", () => navigate("#/splash"));

  // Render robusto
  async function render() {
    const st = store.getState();
    $slot.textContent = safeText(st?.career?.slot || "-");

    const coachName = st?.career?.coach?.name || "Treinador";
    const clubId = st?.career?.clubId || null;

    $sub.textContent = `Treinador: ${safeText(coachName)}`;

    // fallback visual se logo falhar
    $logo.style.opacity = "1";
    $logo.style.filter = "none";

    // Carrega pack e tenta resolver clube
    try {
      const pack = await repos.loadPack(st.app.selectedPackId);

      const club = getClubById(pack, clubId);
      const name = clubName(club, clubId);

      $clubName.textContent = name;

      if (clubId) {
        $logo.src = logoUrl(clubId);
        $logo.onerror = () => {
          $logo.style.opacity = ".25";
          $logo.style.filter = "grayscale(1)";
        };
      } else {
        $logo.removeAttribute("src");
      }
    } catch (err) {
      // se pack falhar, não quebra o hub
      $clubName.textContent = clubId ? `Clube: ${clubId}` : "Hub";
      // mostra erro leve no subtítulo
      $sub.textContent = `Treinador: ${safeText(coachName)} • Pack: erro ao carregar`;
      $logo.style.opacity = ".25";
      $logo.style.filter = "grayscale(1)";
    }
  }

  await render();
  return { render };
}
