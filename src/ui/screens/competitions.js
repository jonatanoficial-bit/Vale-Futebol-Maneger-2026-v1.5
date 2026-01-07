// /src/ui/screens/competitions.js
import { generateSeason } from "../../domain/season/seasonGenerator.js";

function safeText(v) {
  return String(v ?? "").replace(/[<>&"]/g, (c) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    '"': "&quot;"
  }[c]));
}

function fmtList(ids, limit = 12) {
  const a = Array.isArray(ids) ? ids : [];
  const shown = a.slice(0, limit);
  const more = a.length > limit ? ` +${a.length - limit}` : "";
  return shown.join(", ") + more;
}

export async function screenCompetitions({ shell, store, navigate, repos }) {
  const s0 = store.getState();
  if (!s0?.career?.clubId) { navigate("#/clubSelect"); return { render() {} }; }
  if (!s0?.app?.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }

  const el = document.createElement("div");
  el.className = "grid";

  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Competições</div>
          <div class="card__subtitle">Temporada • Vagas • Acesso/Rebaixamento</div>
        </div>
        <span class="badge">v1.1.2</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2" style="gap:12px">
          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900;margin-bottom:6px">Temporada ativa</div>
              <div class="muted" id="seasonInfo" style="font-size:12px;line-height:1.35">—</div>

              <div style="height:10px"></div>

              <button class="btn btn--primary" id="gen">Gerar Temporada 2025/2026</button>
              <div style="height:8px"></div>
              <button class="btn" id="back">Voltar</button>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900;margin-bottom:6px">Competições criadas</div>
              <div class="muted" style="font-size:12px;line-height:1.35;margin-bottom:10px">
                Lista e participantes (MVP).
              </div>
              <div id="list" class="muted" style="font-size:12px;line-height:1.4">—</div>
            </div>
          </div>
        </div>

        <div style="height:12px"></div>

        <div class="card" style="border-radius:18px">
          <div class="card__body">
            <div style="font-weight:900;margin-bottom:6px">Regras (Brasil + CONMEBOL)</div>
            <div class="muted" style="font-size:12px;line-height:1.45">
              • Brasileirão A: top 6 → Libertadores • 7º ao 12º → Sul-Americana • 4 últimos → rebaixamento (MVP).<br/>
              • Copa do Brasil: campeão → Libertadores (MVP).<br/>
              • Libertadores/Sula: incluem placeholders para times fora do Brasil (você completa via Admin/DLC sem mexer no código).<br/>
              • Intercontinental: campeão Libertadores vs campeão Europa (placeholder).
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  shell.mount(el);

  el.querySelector("#back").addEventListener("click", () => navigate("#/hub"));

  const $seasonInfo = el.querySelector("#seasonInfo");
  const $list = el.querySelector("#list");
  const $gen = el.querySelector("#gen");

  async function getClubsFromPack() {
    const st = store.getState();
    const pack = await repos.loadPack(st.app.selectedPackId);
    const clubs =
      pack?.content?.clubs?.clubs ||
      pack?.content?.clubs ||
      pack?.clubs?.clubs ||
      pack?.clubs ||
      [];
    return Array.isArray(clubs) ? clubs : [];
  }

  function render() {
    const st = store.getState();
    const season = st?.career?.season || null;

    if (!season) {
      $seasonInfo.textContent = "Nenhuma temporada ativa.";
      $list.textContent = "—";
      $gen.textContent = "Gerar Temporada 2025/2026";
      return;
    }

    $seasonInfo.textContent = `Temporada: ${safeText(season.id)} • Competições: ${season.competitions?.length || 0}`;
    $gen.textContent = "Regerar Temporada (substituir atual)";

    const comps = Array.isArray(season.competitions) ? season.competitions : [];
    if (!comps.length) {
      $list.textContent = "Nenhuma competição gerada.";
      return;
    }

    $list.innerHTML = comps.map(c => {
      const parts = Array.isArray(c.participants) ? c.participants : [];
      const kind = safeText(c.type || "competition");
      const name = safeText(c.name || c.id);
      const id = safeText(c.id);
      const meta = c.meta?.note ? ` <span class="badge">${safeText(c.meta.note)}</span>` : "";
      return `
        <div class="card" style="border-radius:16px;margin-bottom:8px">
          <div class="card__body">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
              <div style="min-width:0">
                <div style="font-weight:900">${name} <span class="badge">${id}</span> <span class="badge">${kind}</span>${meta}</div>
                <div class="muted" style="font-size:12px;margin-top:6px">
                  Participantes (${parts.length}): ${safeText(fmtList(parts))}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  $gen.addEventListener("click", async () => {
    try {
      const clubs = await getClubsFromPack();

      const st = store.getState();
      const next = structuredClone(st);

      next.career.season = generateSeason({
        clubs,
        seasonId: "2025-2026",
        seed: next.app.selectedPackId || "base"
      });

      store.setState(next);
      alert("Temporada gerada! (MVP) Use 'Salvar' no Hub para gravar no slot.");
      render();
    } catch (err) {
      alert(`Falha ao gerar temporada: ${err?.message || err}`);
    }
  });

  render();
  return { render };
}
