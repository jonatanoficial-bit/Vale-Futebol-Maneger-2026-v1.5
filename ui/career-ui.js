// ui/career-ui.js
// Career creation flow (Phase 3)
// Steps: Profile -> Role -> Club -> Confirm -> Proceed to Lobby
//
// Namespace: window.VFM26.UI.Career

(function () {
  const NS = (window.VFM26 = window.VFM26 || {});
  NS.UI = NS.UI || {};

  const Career = {};

  function $(sel, root = document) {
    return root.querySelector(sel);
  }

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = String(v);
      else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, String(v));
    }
    for (const c of children) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    return node;
  }

  function ensureCrestStyles() {
    if (document.getElementById("career-crest-styles")) return;
    const style = el("style", { id: "career-crest-styles", html: `
      .club-row{display:flex;align-items:center;gap:12px;padding:10px 10px;border-radius:14px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.06);cursor:pointer}
      .club-row:hover{border-color:rgba(0,255,140,.35)}
      .club-crest{width:40px;height:40px;border-radius:10px;object-fit:contain;background:rgba(255,255,255,.06)}
      .club-meta{display:flex;flex-direction:column}
      .club-name{font-weight:800;letter-spacing:.2px}
      .club-sub{opacity:.85;font-size:.92rem}
      .club-badge{margin-left:auto;opacity:.85;font-size:.85rem;padding:6px 10px;border-radius:999px;background:rgba(0,255,140,.12);border:1px solid rgba(0,255,140,.18)}
    `});
    document.head.appendChild(style);
  }

  function leagueLabel(code) {
    if (code === "A") return "Série A";
    if (code === "B") return "Série B";
    return String(code || "Liga");
  }

  function render(container, html) {
    container.innerHTML = html;
  }

  function getState() {
    return NS.Game?.state || {};
  }

  function setCareerPatch(patch) {
    NS.Game?.setCareerPatch?.(patch);
  }

  async function start(container) {
    ensureCrestStyles();

    const state = getState();
    if (!state?.packData) {
      NS.UI?.init?.(container);
      return;
    }

    render(container, `
      <div class="screen">
        <div class="card">
          <h2>Criar Carreira</h2>
          <p>Defina seu perfil. Você pode alterar depois, mas isso impacta algumas notícias e eventos.</p>

          <div class="form">
            <label>Nome</label>
            <input id="careerName" type="text" placeholder="Seu nome" value="${escapeHtml(state.career?.name || "")}" />

            <label>País</label>
            <select id="careerCountry">
              ${countryOption(state.career?.country || "BR")}
            </select>

            <label>Avatar</label>
            <select id="careerAvatar">
              ${avatarOptions(state.career?.avatar || "default")}
            </select>
          </div>

          <div class="actions">
            <button class="btn secondary" id="btnBack">Voltar</button>
            <button class="btn primary" id="btnNext">Continuar</button>
          </div>
        </div>
      </div>
    `);

    $("#btnBack", container).addEventListener("click", () => NS.UI?.init?.(container));
    $("#btnNext", container).addEventListener("click", () => {
      const name = String($("#careerName", container).value || "").trim();
      const country = String($("#careerCountry", container).value || "BR");
      const avatar = String($("#careerAvatar", container).value || "default");
      setCareerPatch({ name: name || "Treinador", country, avatar });
      stepRole(container);
    });
  }

  function stepRole(container) {
    const state = getState();
    const current = String(state.career?.role || "coach");

    render(container, `
      <div class="screen">
        <div class="card">
          <h2>Escolher Cargo</h2>
          <p>O cargo muda o que você controla no clube.</p>

          <div class="grid">
            ${roleCard("coach", "Treinador", "Escalação, treinos, tática, gestão do elenco.", current)}
            ${roleCard("director", "Diretor Esportivo", "Contratações (jogadores/staff), planejamento e negociações.", current)}
            ${roleCard("president", "Presidente", "Gestão total: finanças, estrutura, metas e decisões estratégicas.", current)}
          </div>

          <div class="actions">
            <button class="btn secondary" id="btnBack">Voltar</button>
            <button class="btn primary" id="btnNext" disabled>Continuar</button>
          </div>
        </div>
      </div>
    `);

    let selected = current || "";
    const cards = container.querySelectorAll("[data-role]");
    const nextBtn = $("#btnNext", container);

    function refresh() {
      cards.forEach(c => c.classList.toggle("selected", c.getAttribute("data-role") === selected));
      nextBtn.disabled = !selected;
    }

    cards.forEach(c => {
      c.addEventListener("click", () => {
        selected = c.getAttribute("data-role");
        refresh();
      });
    });

    $("#btnBack", container).addEventListener("click", () => start(container));
    nextBtn.addEventListener("click", () => {
      setCareerPatch({ role: selected });
      stepClub(container);
    });

    refresh();
  }

  function stepClub(container) {
    const state = getState();
    const clubs = NS.Game?.getClubsFromPack?.() || [];
    const currentId = String(state.career?.clubId || "");

    const list = clubs.map(c => {
      const crest = escapeHtml(c.crest || `assets/crests/${String(c.id)}.png`);
      const badge = `${leagueLabel(c.league)} • ${escapeHtml(c.state || "")}`;
      const rating = typeof c.rating === "number" ? `OVR ${c.rating}` : "OVR ?";
      return `
        <div class="club-row" data-club="${escapeHtml(String(c.id))}">
          <img class="club-crest" src="${crest}" alt="" onerror="this.style.visibility='hidden'"/>
          <div class="club-meta">
            <div class="club-name">${escapeHtml(c.name)}</div>
            <div class="club-sub">${badge} • Orçamento: ${formatMoney(c.budget)}</div>
          </div>
          <div class="club-badge">${rating}</div>
        </div>
      `;
    }).join("");

    render(container, `
      <div class="screen">
        <div class="card">
          <h2>Escolher Clube</h2>
          <p>Começamos pelo Brasil. No futuro você só adiciona novos packs em <code>/packs</code> e registra no <code>catalog.json</code>.</p>

          <div class="list" id="clubList" style="display:flex;flex-direction:column;gap:10px;max-height:52vh;overflow:auto;padding-right:4px">
            ${list || `<div class="muted">Nenhum clube encontrado no pack selecionado.</div>`}
          </div>

          <div class="actions">
            <button class="btn secondary" id="btnBack">Voltar</button>
            <button class="btn primary" id="btnNext" disabled>Continuar</button>
          </div>
        </div>
      </div>
    `);

    let selected = currentId;
    const nextBtn = $("#btnNext", container);

    function refresh() {
      container.querySelectorAll(".club-row").forEach(row => {
        const id = row.getAttribute("data-club");
        row.style.outline = (id === selected) ? "2px solid rgba(0,255,140,.45)" : "none";
      });
      nextBtn.disabled = !selected;
    }

    container.querySelectorAll(".club-row").forEach(row => {
      row.addEventListener("click", () => {
        selected = row.getAttribute("data-club");
        refresh();
      });
    });

    $("#btnBack", container).addEventListener("click", () => stepRole(container));
    nextBtn.addEventListener("click", () => {
      setCareerPatch({ clubId: selected });
      stepConfirm(container);
    });

    refresh();
  }

  function stepConfirm(container) {
    const state = getState();
    const career = state.career || {};
    const club = (NS.Game?.getClubsFromPack?.() || []).find(c => String(c.id) === String(career.clubId));
    const crest = club?.crest || `assets/crests/${String(club?.id || "")}.png`;

    render(container, `
      <div class="screen">
        <div class="card">
          <h2>Confirmar</h2>
          <p>Revise antes de iniciar. (Você poderá ajustar algumas coisas depois.)</p>

          <div style="display:flex;gap:14px;align-items:center;margin-top:10px">
            <img class="club-crest" style="width:56px;height:56px;border-radius:14px" src="${escapeHtml(crest)}" alt="" onerror="this.style.visibility='hidden'"/>
            <div>
              <div style="font-weight:900;font-size:1.05rem">${escapeHtml(career.name || "Treinador")}</div>
              <div class="muted">${escapeHtml(roleLabel(career.role))} • ${escapeHtml(career.country || "BR")} • Avatar: ${escapeHtml(career.avatar || "default")}</div>
              <div style="margin-top:6px;font-weight:800">${escapeHtml(club?.name || "Clube não selecionado")}</div>
              <div class="muted">${leagueLabel(club?.league)} • ${escapeHtml(club?.state || "")}</div>
            </div>
          </div>

          <div class="actions">
            <button class="btn secondary" id="btnBack">Voltar</button>
            <button class="btn primary" id="btnStart">Iniciar Carreira</button>
          </div>
        </div>
      </div>
    `);

    $("#btnBack", container).addEventListener("click", () => stepClub(container));
    $("#btnStart", container).addEventListener("click", async () => {
      await NS.Game?.saveCurrentSlot?.();
      NS.UI?.Lobby?.start?.(container);
    });
  }

  function roleLabel(role) {
    if (role === "director") return "Diretor Esportivo";
    if (role === "president") return "Presidente";
    return "Treinador";
  }

  function formatMoney(v) {
    if (typeof v !== "number" || !isFinite(v)) return "—";
    try {
      return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
    } catch {
      return "R$ " + Math.round(v).toString();
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function countryOption(selected) {
    const options = [
      ["BR", "Brasil"],
      ["AR", "Argentina"],
      ["UY", "Uruguai"],
      ["CL", "Chile"],
      ["CO", "Colômbia"],
      ["PT", "Portugal"],
      ["ES", "Espanha"],
      ["FR", "França"],
      ["DE", "Alemanha"],
      ["IT", "Itália"],
      ["GB", "Inglaterra"],
    ];
    return options
      .map(([code, label]) => `<option value="${code}" ${code === selected ? "selected" : ""}>${label}</option>`)
      .join("");
  }

  function avatarOptions(selected) {
    const items = ["default", "01", "02", "03", "04", "05"];
    return items
      .map(id => `<option value="${id}" ${id === selected ? "selected" : ""}>Avatar ${id}</option>`)
      .join("");
  }

  function roleCard(id, title, desc, current) {
    const selected = id === current ? "selected" : "";
    return `
      <div class="role-card ${selected}" data-role="${id}" style="padding:14px;border-radius:16px;background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.06);cursor:pointer">
        <div style="font-weight:900;font-size:1.05rem">${title}</div>
        <div class="muted" style="margin-top:6px">${desc}</div>
      </div>
    `;
  }

  Career.start = start;
  NS.UI.Career = Career;
})();