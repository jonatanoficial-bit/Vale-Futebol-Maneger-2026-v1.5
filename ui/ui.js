/* ui/ui.js
   UI router + screens (safe binds)
   Regra: nunca quebrar por elemento ausente (null) ao setar onclick
*/

const $ = (sel) => document.querySelector(sel);

const $id = (id) => document.getElementById(id);
const onClick = (id, handler) => {
  const el = $id(id);
  if (!el) return;
  el.onclick = handler;
};

const $app = () => $id("app");

const btn = (id, text, cls = "btn") =>
  `<button id="${id}" class="${cls}">${text}</button>`;

const card = (title, body) =>
  `<div class="card"><div class="card-title">${title}</div><div class="card-body">${body}</div></div>`;

const formatDate = (iso) => {
  try {
    const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
    if (!y || !m || !d) return iso;
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  } catch {
    return iso;
  }
};

const setHTML = (html) => {
  const root = $app();
  if (!root) return;
  root.innerHTML = html;
};

const UI = (() => {
  let engine = null;
  let getState = null;
  let actions = null;

  const screen = {
    name: "cover",
    params: {},
  };

  const setEngine = (eng, stateGetter, actionApi) => {
    engine = eng;
    getState = stateGetter;
    actions = actionApi;
  };

  const goto = (name, params = {}) => {
    screen.name = name;
    screen.params = params || {};
    render();
  };

  const header = (title, right = "") => `
    <div class="topbar">
      <div class="topbar-title">${title || ""}</div>
      <div class="topbar-right">${right || ""}</div>
    </div>
  `;

  const sectionTitle = (t) => `<div class="section-title">${t}</div>`;

  // -------- COVER --------
  const renderCover = () => {
    const s = getState();
    const coverUrl = (s?.config?.coverUrl) || (s?.ui?.coverUrl) || (s?.assets?.coverUrl) || "";
    setHTML(`
      <div class="screen screen-cover">
        ${header("Vale Futebol Manager 2026")}
        <div class="cover-wrap">
          <div class="cover-box">
            ${coverUrl ? `<img class="cover-img" src="${coverUrl}" alt="Capa" />` : `<div class="cover-fallback">CAPA</div>`}
          </div>
          <div class="cover-actions">
            ${btn("goPack", "INICIAR", "btn btn-primary")}
          </div>
        </div>
      </div>
    `);

    onClick("goPack", () => goto("pack"));
  };

  // -------- PACK SELECT --------
  const renderPack = () => {
    const s = getState();
    const packs = s?.packs?.available || [];
    const current = s?.packs?.selectedId || "";

    const options = packs
      .map((p) => `<option value="${p.id}" ${p.id === current ? "selected" : ""}>${p.name}</option>`)
      .join("");

    setHTML(`
      <div class="screen">
        ${header("Pacote de Dados")}
        ${card(
          "Escolha o pacote (DLC)",
          `
          <div class="row">
            <label>Pacote:</label>
            <select id="packSelect">${options}</select>
          </div>
          <div class="row muted">
            O pacote pode ser atualizado sem mexer no código (conteúdo/temporadas/clubes).
          </div>
          <div class="row gap">
            ${btn("packConfirm", "CONFIRMAR", "btn btn-primary")}
            ${btn("backCover", "VOLTAR", "btn")}
          </div>
        `
        )}
      </div>
    `);

    onClick("backCover", () => goto("cover"));
    onClick("packConfirm", () => {
      const sel = $id("packSelect");
      const packId = sel ? sel.value : "";
      if (!packId) return;
      actions?.packs?.select?.(packId);
      goto("slots");
    });
  };

  // -------- SLOTS --------
  const renderSlots = () => {
    const s = getState();
    const slots = s?.career?.slots || [null, null];

    const slotCard = (idx) => {
      const data = slots[idx] || null;
      const title = `Slot ${idx + 1}`;
      const body = data
        ? `
          <div><b>${data.clubName || "Clube"}</b></div>
          <div class="muted">${data.managerName || "Manager"} • ${data.role || "Treinador"}</div>
          <div class="row gap">
            ${btn(`slotPlay_${idx}`, "CONTINUAR", "btn btn-primary")}
            ${btn(`slotDel_${idx}`, "APAGAR", "btn btn-danger")}
          </div>
        `
        : `
          <div class="muted">Vazio</div>
          <div class="row">
            ${btn(`slotNew_${idx}`, "NOVA CARREIRA", "btn btn-primary")}
          </div>
        `;

      return card(title, body);
    };

    setHTML(`
      <div class="screen">
        ${header("Salvar / Carreiras")}
        ${slotCard(0)}
        ${slotCard(1)}
        <div class="row gap">
          ${btn("backPack", "VOLTAR", "btn")}
        </div>
      </div>
    `);

    onClick("backPack", () => goto("pack"));

    onClick("slotNew_0", () => actions?.career?.newCareer?.(0));
    onClick("slotNew_1", () => actions?.career?.newCareer?.(1));

    onClick("slotPlay_0", () => actions?.career?.loadSlot?.(0));
    onClick("slotPlay_1", () => actions?.career?.loadSlot?.(1));

    onClick("slotDel_0", () => actions?.career?.deleteSlot?.(0));
    onClick("slotDel_1", () => actions?.career?.deleteSlot?.(1));
  };

  // -------- CREATE CAREER (AVATAR/NAME/COUNTRY) --------
  const renderCreateCareer = () => {
    const s = getState();
    const slot = s?.ui?.creatingSlot ?? 0;

    const countries = (s?.data?.countries || ["Brasil"]).map((c) => `<option value="${c}">${c}</option>`).join("");

    setHTML(`
      <div class="screen">
        ${header("Criar Carreira")}
        ${card(
          `Slot ${slot + 1}`,
          `
          <div class="row">
            <label>Nome do Manager</label>
            <input id="mgrName" placeholder="Seu nome" />
          </div>
          <div class="row">
            <label>País</label>
            <select id="mgrCountry">${countries}</select>
          </div>
          <div class="row muted">
            Avatar: (fase seguinte) — por enquanto usamos placeholder para manter estável.
          </div>
          <div class="row gap">
            ${btn("toRole", "CONTINUAR", "btn btn-primary")}
            ${btn("backSlots", "VOLTAR", "btn")}
          </div>
        `
        )}
      </div>
    `);

    onClick("backSlots", () => goto("slots"));
    onClick("toRole", () => {
      const nameEl = $id("mgrName");
      const countryEl = $id("mgrCountry");
      const name = (nameEl ? nameEl.value : "").trim();
      const country = (countryEl ? countryEl.value : "Brasil").trim();
      if (!name) return;
      actions?.career?.setManagerProfile?.({ name, country });
      goto("role");
    });
  };

  // -------- ROLE SELECT --------
  const renderRole = () => {
    setHTML(`
      <div class="screen">
        ${header("Escolha o Cargo")}
        ${card(
          "Cargo na Carreira",
          `
          <div class="row gap">
            ${btn("roleCoach", "TREINADOR", "btn btn-primary")}
            ${btn("roleDoF", "DIRETOR ESPORTIVO", "btn btn-primary")}
            ${btn("rolePresident", "PRESIDENTE", "btn btn-primary")}
          </div>
          <div class="row muted">
            Cada cargo terá funções diferentes (contratações, staff, finanças, infraestrutura etc).
          </div>
          <div class="row gap">
            ${btn("backCreate", "VOLTAR", "btn")}
          </div>
        `
        )}
      </div>
    `);

    onClick("backCreate", () => goto("createCareer"));
    onClick("roleCoach", () => { actions?.career?.setRole?.("Treinador"); goto("club"); });
    onClick("roleDoF", () => { actions?.career?.setRole?.("Diretor Esportivo"); goto("club"); });
    onClick("rolePresident", () => { actions?.career?.setRole?.("Presidente"); goto("club"); });
  };

  // -------- CLUB SELECT --------
  const renderClub = () => {
    const s = getState();
    const clubs = s?.data?.clubs || [];
    const options = clubs.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");

    setHTML(`
      <div class="screen">
        ${header("Escolha o Clube")}
        ${card(
          "Clubes disponíveis",
          `
          <div class="row">
            <label>Clube</label>
            <select id="clubSelect">${options}</select>
          </div>
          <div class="row gap">
            ${btn("clubConfirm", "CONFIRMAR", "btn btn-primary")}
            ${btn("backRole", "VOLTAR", "btn")}
          </div>
        `
        )}
      </div>
    `);

    onClick("backRole", () => goto("role"));
    onClick("clubConfirm", () => {
      const sel = $id("clubSelect");
      const clubId = sel ? sel.value : "";
      if (!clubId) return;
      actions?.career?.setClub?.(clubId);
      goto("welcome");
    });
  };

  // -------- WELCOME / TUTORIAL --------
  const renderWelcome = () => {
    const s = getState();
    const clubName = s?.career?.clubName || "Clube";
    const role = s?.career?.role || "Treinador";
    setHTML(`
      <div class="screen">
        ${header("Bem-vindo")}
        ${card(
          clubName,
          `
          <div class="row">
            <div>Olá! Seja bem-vindo ao ${clubName}.</div>
            <div class="muted">Cargo: <b>${role}</b></div>
          </div>
          <div class="row muted">
            Este é um tutorial curto. Você poderá gerenciar o clube no Lobby.
          </div>
          <div class="row">
            ${btn("toLobby", "IR PARA O LOBBY", "btn btn-primary")}
          </div>
        `
        )}
      </div>
    `);

    onClick("toLobby", () => {
      actions?.career?.finalizeCreation?.();
      goto("lobby");
    });
  };

  // -------- LOBBY --------
  const renderLobby = () => {
    const s = getState();
    const clubName = s?.career?.clubName || "Clube";
    const manager = s?.career?.managerName || "Manager";
    const country = s?.career?.managerCountry || "Brasil";
    const role = s?.career?.role || "Treinador";
    const slot = (s?.career?.activeSlot ?? 0) + 1;

    const next = s?.calendar?.nextMatch || null;
    const nextText = next
      ? `${formatDate(next.date)} • ${next.competition} • ${next.roundLabel} • ${next.homeShort} x ${next.awayShort}`
      : "Sem próximo jogo (ainda)";

    setHTML(`
      <div class="screen">
        ${header("Lobby", `<span class="pill">Slot ${slot} • ${role}</span>`)}
        ${card(
          clubName,
          `
          <div class="muted">${manager} • ${country}</div>
        `
        )}

        ${card(
          "PRÓXIMO JOGO",
          `
          <div class="muted">${nextText}</div>
          <div class="row">
            ${btn("goNextMatchDate", "IR PARA DATA DO PRÓXIMO JOGO", "btn btn-primary")}
          </div>
        `
        )}

        <div class="stack">
          ${btn("goSquad", "ELENCO", "btn btn-primary")}
          ${btn("goCalendar", "CALENDÁRIO (REAL)", "btn btn-primary")}
          ${btn("goMarket", "MERCADO", "btn btn-primary")}
          ${btn("goTactics", "TÁTICAS", "btn btn-gold")}
          ${btn("goAdvance", "AVANÇAR DATA", "btn")}
          ${btn("goSave", "SALVAR", "btn btn-primary")}
          ${btn("exitToCover", "SAIR PARA CAPA", "btn")}
        </div>

        <div class="muted footer-note">
          Próximo passo (Entrega seguinte): Simular Partida e salvar resultado em tabela.
        </div>
      </div>
    `);

    onClick("goSquad", () => goto("squad"));
    onClick("goCalendar", () => goto("calendar"));
    onClick("goMarket", () => goto("market"));
    onClick("goTactics", () => goto("tactics"));
    onClick("goAdvance", () => actions?.calendar?.advanceDay?.());
    onClick("goSave", () => actions?.career?.saveNow?.());
    onClick("exitToCover", () => goto("cover"));

    onClick("goNextMatchDate", () => actions?.calendar?.jumpToNextMatchDate?.());
  };

  // -------- CALENDAR --------
  const renderCalendar = () => {
    const s = getState();
    const cur = s?.calendar?.currentDate || "2026-01-01";
    const next = s?.calendar?.nextMatch || null;

    const nextText = next
      ? `${formatDate(next.date)} • ${next.competition} • ${next.roundLabel} • ${next.homeShort} x ${next.awayShort}`
      : "—";

    const blocks = s?.calendar?.blocks || [];
    const items = blocks
      .map(
        (b) => `
        <div class="list-item">
          <div class="list-title">${formatDate(b.date)} • ${b.competition} • ${b.phase}</div>
          <div class="list-sub">${b.label || b.competition}</div>
        </div>`
      )
      .join("");

    setHTML(`
      <div class="screen">
        ${header("CALENDÁRIO ANUAL (REAL)")}
        <div class="muted">Data atual da carreira: <b>${formatDate(cur)}</b></div>
        <div class="muted">Próximo jogo: <b>${nextText}</b></div>

        <div class="row gap">
          ${btn("advanceInCalendar", "AVANÇAR PARA PRÓXIMA DATA", "btn btn-primary")}
          ${btn("jumpInCalendar", "IR PARA PRÓXIMO JOGO", "btn")}
        </div>

        ${sectionTitle("Eventos")}
        <div class="list">
          ${items || `<div class="muted">Sem eventos.</div>`}
        </div>

        <div class="row gap">
          ${btn("backLobby", "VOLTAR", "btn")}
        </div>
      </div>
    `);

    onClick("backLobby", () => goto("lobby"));
    onClick("advanceInCalendar", () => actions?.calendar?.advanceDay?.());
    onClick("jumpInCalendar", () => actions?.calendar?.jumpToNextMatch?.());
  };

  // -------- PLACEHOLDER SCREENS --------
  const renderPlaceholder = (title) => {
    setHTML(`
      <div class="screen">
        ${header(title)}
        ${card(
          title,
          `<div class="muted">Tela em construção nesta fase. (Mantida para estabilidade)</div>
           <div class="row">${btn("backLobby", "VOLTAR", "btn")}</div>`
        )}
      </div>
    `);
    onClick("backLobby", () => goto("lobby"));
  };

  const render = () => {
    const s = getState?.();
    // roteamento básico
    switch (screen.name) {
      case "cover":
        return renderCover();
      case "pack":
        return renderPack();
      case "slots":
        return renderSlots();
      case "createCareer":
        return renderCreateCareer();
      case "role":
        return renderRole();
      case "club":
        return renderClub();
      case "welcome":
        return renderWelcome();
      case "lobby":
        return renderLobby();
      case "calendar":
        return renderCalendar();
      case "squad":
        return renderPlaceholder("Elenco");
      case "market":
        return renderPlaceholder("Mercado");
      case "tactics":
        return renderPlaceholder("Táticas");
      default:
        return renderCover();
    }
  };

  const boot = () => {
    // tenta ir para lobby se já houver carreira carregada
    const s = getState?.();
    const hasCareer = !!s?.career?.isActive;
    if (hasCareer) goto("lobby");
    else goto("cover");
  };

  return { setEngine, goto, render, boot };
})();

// Export global (compatível com scripts antigos)
window.UI = UI;