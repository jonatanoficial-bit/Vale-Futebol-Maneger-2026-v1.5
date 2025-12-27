/* ============================================================
   VALE FUTEBOL MANAGER 2026
   Ui/tactics-ui.js — TÁTICAS UI AAA (SM26-like)
   ------------------------------------------------------------
   Compatível com sua tela existente:
   - Usa IDs que já existem no projeto (quando disponíveis):
     • #btn-voltar-lobby, #select-formacao, #select-estilo
     • #campo-tatico, #lista-reservas, #btn-salvar-tatica
   - Se algum elemento não existir, cria controles dentro do painel.

   Agora inclui controles AAA:
   - mentalidade, ritmo, pressão, linha defensiva, largura
   - e salva em engine/tactics.js (gameState.tactics.byTeam)

   API:
   - TacticsUI.init()
   - TacticsUI.renderPainel()
   ============================================================ */

(function () {
  console.log("%c[TacticsUI] tactics-ui.js carregado (AAA)", "color:#22c55e; font-weight:bold;");

  // -----------------------------
  // CSS leve (sem quebrar seu tema)
  // -----------------------------
  function injectCssOnce() {
    if (document.getElementById("vf-tactics-css")) return;
    const s = document.createElement("style");
    s.id = "vf-tactics-css";
    s.textContent = `
      .vf-tac-panel{
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(0,0,0,.25);
        padding: 10px;
        margin: 10px 0;
      }
      .vf-tac-row{
        display:flex; gap:10px; flex-wrap:wrap;
        align-items:center; justify-content:space-between;
        margin: 8px 0;
      }
      .vf-tac-row label{
        font-weight: 1000;
        opacity:.9;
        letter-spacing:.4px;
        text-transform: uppercase;
        font-size: 12px;
      }
      .vf-tac-row select, .vf-tac-row input{
        min-width: 180px;
        flex: 1;
        background: rgba(0,0,0,.35);
        color: rgba(255,255,255,.94);
        border:1px solid rgba(255,255,255,.12);
        border-radius: 14px;
        padding: 10px 12px;
        font-weight: 1000;
        outline:none;
      }
      .vf-pill{
        display:inline-flex; align-items:center; gap:8px;
        padding:6px 10px; border-radius:999px;
        border:1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        font-weight:1000; font-size:11px;
        letter-spacing:.2px;
      }
      .vf-pill.ok{color:#86efac}
      .vf-pill.warn{color:#fbbf24}
      .vf-pill.bad{color:#fb7185}
      .vf-muted{opacity:.75}
    `;
    document.head.appendChild(s);
  }

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function el(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = String(txt);
    return e;
  }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.seasonYear) gs.seasonYear = 2026;
    return gs;
  }

  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  // -----------------------------
  // Campo + Reservas
  // -----------------------------
  let reservaSelecionadaId = null;

  function renderCampoTatico(titularesFmt) {
    const campoEl = document.getElementById("campo-tatico");
    if (!campoEl) return;

    campoEl.innerHTML = "";

    titularesFmt.forEach((slot, idx) => {
      const slotEl = document.createElement("div");
      slotEl.className = "slot-jogador";
      slotEl.style.position = "absolute";
      slotEl.style.left = `${slot.x}%`;
      slotEl.style.top = `${slot.y}%`;
      slotEl.style.transform = "translate(-50%, -50%)";
      slotEl.style.cursor = "pointer";

      slotEl.innerHTML = `
        <div style="font-weight:1000;">${slot.pos}</div>
        <div class="vf-muted" style="font-size:12px; font-weight:900;">${slot.nome}</div>
        <div class="vf-muted" style="font-size:11px; font-weight:900;">OVR ${slot.overall}</div>
      `;

      slotEl.onclick = () => {
        if (!reservaSelecionadaId) {
          alert("Selecione um reserva primeiro para trocar.");
          return;
        }
        if (!window.Tactics || typeof Tactics.trocar !== "function") return;
        const ok = Tactics.trocar(idx, reservaSelecionadaId);
        reservaSelecionadaId = null;
        if (!ok) alert("Falha na troca.");
        window.TacticsUI.renderPainel();
      };

      campoEl.appendChild(slotEl);
    });
  }

  function renderReservas(reservas) {
    const lista = document.getElementById("lista-reservas");
    if (!lista) return;

    lista.innerHTML = "";
    reservas.forEach(r => {
      const item = document.createElement("div");
      item.className = "reserva-item";
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.justifyContent = "space-between";
      item.style.gap = "10px";
      item.style.padding = "8px 10px";
      item.style.borderRadius = "14px";
      item.style.border = "1px solid rgba(255,255,255,.10)";
      item.style.background = "rgba(0,0,0,.22)";
      item.style.marginBottom = "6px";
      item.style.cursor = "pointer";

      const left = document.createElement("div");
      left.innerHTML = `<div style="font-weight:1000;">${r.nome}</div><div class="vf-muted" style="font-size:12px; font-weight:900;">${r.pos} • OVR ${r.overall}</div>`;

      const pill = el("div", "vf-pill", "Selecionar");
      item.onclick = () => {
        reservaSelecionadaId = r.id;
        // destaca visual
        [...lista.children].forEach(ch => ch.style.outline = "none");
        item.style.outline = "2px solid rgba(34,197,94,.55)";
      };

      item.appendChild(left);
      item.appendChild(pill);
      lista.appendChild(item);
    });
  }

  // -----------------------------
  // Painel de controles AAA
  // -----------------------------
  function ensureAdvancedPanel() {
    injectCssOnce();

    // tentamos colocar num container existente, senão criamos no body da tela
    const tela = document.getElementById("tela-taticas") || document.body;

    let panel = document.getElementById("vf-advanced-tactics");
    if (panel) return panel;

    panel = el("div", "vf-tac-panel");
    panel.id = "vf-advanced-tactics";

    const title = el("div", "");
    title.style.display = "flex";
    title.style.alignItems = "center";
    title.style.justifyContent = "space-between";
    title.style.gap = "10px";
    title.style.marginBottom = "8px";
    title.appendChild(el("div", "", "Configurações avançadas"));

    const badge = el("div", "vf-pill ok", "SM26-like");
    title.appendChild(badge);

    panel.appendChild(title);

    // inserir após selects clássicos se existirem
    const anchor = document.getElementById("select-estilo") || document.getElementById("select-formacao");
    if (anchor && anchor.parentElement) {
      anchor.parentElement.appendChild(panel);
    } else {
      tela.appendChild(panel);
    }

    return panel;
  }

  function buildSelect(labelText, id, options) {
    const row = el("div", "vf-tac-row");
    row.appendChild(el("label", "", labelText));

    const sel = document.createElement("select");
    sel.id = id;

    options.forEach(([v, t]) => {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = t;
      sel.appendChild(o);
    });

    row.appendChild(sel);
    return { row, sel };
  }

  function buildLevelSelect(labelText, id) {
    return buildSelect(labelText, id, [
      ["1", "1 (Baixo)"],
      ["2", "2"],
      ["3", "3 (Médio)"],
      ["4", "4"],
      ["5", "5 (Alto)"]
    ]);
  }

  function syncAdvancedControls(teamId) {
    const panel = ensureAdvancedPanel();
    if (!panel) return;

    if (!window.Tactics) {
      panel.innerHTML = `<div class="vf-muted">Engine Tactics não carregado.</div>`;
      return;
    }

    const tac = Tactics.getTeamTactics(teamId);

    // cria controles se não existirem
    if (!document.getElementById("select-mentalidade")) {
      const a = buildSelect("Mentalidade", "select-mentalidade", [
        ["ultra_ofensiva","Ultra Ofensiva"],
        ["ofensiva","Ofensiva"],
        ["equilibrada","Equilibrada"],
        ["cautelosa","Cautelosa"],
        ["ultra_defensiva","Ultra Defensiva"]
      ]);
      panel.appendChild(a.row);
    }

    if (!document.getElementById("select-ritmo")) {
      panel.appendChild(buildLevelSelect("Ritmo", "select-ritmo").row);
    }
    if (!document.getElementById("select-pressao")) {
      panel.appendChild(buildLevelSelect("Pressão", "select-pressao").row);
    }
    if (!document.getElementById("select-linha")) {
      panel.appendChild(buildLevelSelect("Linha defensiva", "select-linha").row);
    }
    if (!document.getElementById("select-largura")) {
      panel.appendChild(buildLevelSelect("Largura", "select-largura").row);
    }

    // set values
    const m = document.getElementById("select-mentalidade");
    const r = document.getElementById("select-ritmo");
    const p = document.getElementById("select-pressao");
    const l = document.getElementById("select-linha");
    const w = document.getElementById("select-largura");

    if (m) m.value = tac.mentalidade;
    if (r) r.value = String(tac.ritmo);
    if (p) p.value = String(tac.pressao);
    if (l) l.value = String(tac.linhaDefensiva);
    if (w) w.value = String(tac.largura);

    // bind change -> salvar
    const apply = () => {
      const patch = {
        mentalidade: String(m?.value || "equilibrada"),
        ritmo: n(r?.value, 3),
        pressao: n(p?.value, 3),
        linhaDefensiva: n(l?.value, 3),
        largura: n(w?.value, 3)
      };
      Tactics.setTeamTactics(teamId, patch);
      // feedback simples
      const mods = Tactics.getMatchModifiers(teamId);
      const badge = panel.querySelector(".vf-pill");
      if (badge) {
        const risk = mods.riskMul;
        badge.className = "vf-pill " + (risk > 1.06 ? "warn" : risk < 0.97 ? "ok" : "ok");
        badge.textContent = risk > 1.06 ? "Mais risco" : risk < 0.97 ? "Mais seguro" : "Balanceado";
      }
    };

    [m, r, p, l, w].forEach(x => {
      if (!x || x.__vfBound) return;
      x.__vfBound = true;
      x.onchange = apply;
    });
  }

  // -----------------------------
  // Main UI controller
  // -----------------------------
  window.TacticsUI = {
    init() {
      injectCssOnce();

      // Botão para voltar ao lobby
      const btnVoltar = document.getElementById("btn-voltar-lobby");
      if (btnVoltar) {
        btnVoltar.onclick = () => {
          if (typeof mostrarTela === "function") mostrarTela("tela-lobby");
          else if (window.UI && typeof UI.voltarLobby === "function") UI.voltarLobby();
        };
      }

      // Setup selects clássicos
      const teamId = getUserTeamId();
      if (window.Tactics && typeof Tactics.ensureElencoETitulares === "function") {
        Tactics.ensureElencoETitulares();
      }

      // Formação
      const selFormacao = document.getElementById("select-formacao");
      if (selFormacao && window.Tactics) {
        selFormacao.innerHTML = "";
        const forms = Tactics.FORMATIONS || {};
        Object.keys(forms).forEach(key => {
          const opt = document.createElement("option");
          opt.value = key;
          opt.textContent = key;
          selFormacao.appendChild(opt);
        });

        // valor inicial
        if (window.Game && Game.formacao) selFormacao.value = Game.formacao;
        else if (teamId && Tactics.getTeamTactics) selFormacao.value = Tactics.getTeamTactics(teamId).formacao;

        selFormacao.onchange = () => {
          const nova = selFormacao.value;
          if (window.Tactics && typeof Tactics.atualizarFormacao === "function") {
            Tactics.atualizarFormacao(nova);
            selFormacao.value = nova;
            this.renderPainel();
          }
        };
      }

      // Estilo
      const selEstilo = document.getElementById("select-estilo");
      if (selEstilo) {
        if (!selEstilo.querySelector("option")) {
          selEstilo.innerHTML = `
            <option value="ofensivo">Ofensivo</option>
            <option value="equilibrado">Equilibrado</option>
            <option value="defensivo">Defensivo</option>
          `;
        }

        if (window.Game && Game.estilo) selEstilo.value = Game.estilo;
        else if (teamId && window.Tactics) selEstilo.value = Tactics.getTeamTactics(teamId).estilo;

        selEstilo.onchange = () => {
          const v = String(selEstilo.value || "equilibrado");
          if (!window.Game) window.Game = {};
          Game.estilo = v;
          if (teamId && window.Tactics) Tactics.setTeamTactics(teamId, { estilo: v });
          this.renderPainel();
        };
      }

      // Botão salvar
      const btnSalvar = document.getElementById("btn-salvar-tatica");
      if (btnSalvar) {
        btnSalvar.onclick = () => {
          if (window.Tactics && typeof Tactics.salvarTatica === "function") {
            Tactics.salvarTatica();
            alert("Tática salva!");
          }
        };
      }

      this.renderPainel();
    },

    renderPainel() {
      const teamId = getUserTeamId();
      if (!teamId) return;

      if (window.Tactics && typeof Tactics.ensureElencoETitulares === "function") {
        Tactics.ensureElencoETitulares();
      }

      if (window.Tactics && typeof Tactics.formatTitulares === "function") {
        const titularesFmt = Tactics.formatTitulares();
        renderCampoTatico(titularesFmt);
      }

      // render reservas
      if (window.gameState && Array.isArray(window.gameState.reservas)) {
        renderReservas(window.gameState.reservas);
      }

      // advanced
      if (window.Tactics) syncAdvancedControls(teamId);
    }
  };

  // auto init (não quebra se sua UI chamar manualmente)
  setTimeout(() => {
    try {
      if (window.TacticsUI && typeof TacticsUI.init === "function") TacticsUI.init();
    } catch (e) {}
  }, 200);
})();