/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/tactics-ui.js — Táticas AAA (Formação + 11 Titulares)
   -------------------------------------------------------
   Entrega:
   - Selecionar formação (4-4-2, 4-3-3, 3-5-2, 4-2-3-1, 5-3-2, 4-1-4-1)
   - Marcar 11 titulares com validação (bloqueia LESIONADO/SUSPENSO)
   - Salvar em gameState.formacao e gameState.titulares (ids)
   - Feedback visual (badges + desabilitar seleção)
   =======================================================*/

(function () {
  console.log("%c[TacticsUI] tactics-ui.js carregado", "color:#a78bfa; font-weight:bold;");

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function el(tag, cls, txt) {
    const d = document.createElement(tag);
    if (cls) d.className = cls;
    if (txt != null) d.textContent = txt;
    return d;
  }
  function clear(node) { if (!node) return; while (node.firstChild) node.removeChild(node.firstChild); }

  function ensureGS() {
    if (!window.gameState) window.gameState = {};
    const gs = window.gameState;
    if (!gs.formacao) gs.formacao = "4-4-2";
    if (!Array.isArray(gs.titulares)) gs.titulares = [];
    return gs;
  }

  function getTeams() {
    return (window.Database && Array.isArray(Database.teams)) ? Database.teams : [];
  }
  function getPlayers() {
    return (window.Database && Array.isArray(Database.players)) ? Database.players : [];
  }
  function getUserTeamId() {
    const gs = ensureGS();
    return gs.currentTeamId || gs.selectedTeamId || (window.Game ? Game.teamId : null);
  }

  function getTeamPlayers(teamId) {
    return getPlayers().filter(p => String(p.teamId) === String(teamId));
  }

  function isAvailable(pid) {
    try { if (window.Fitness && typeof Fitness.isAvailable === "function") return Fitness.isAvailable(pid); } catch (e) {}
    return true;
  }
  function fitnessOf(pid) {
    try { if (window.Fitness && typeof Fitness.ensurePlayer === "function") return Fitness.ensurePlayer(pid); } catch (e) {}
    return { fatigue: 10, injuryWeeks: 0, suspended: false, yellowCards: 0 };
  }

  // -----------------------------
  // Render
  // -----------------------------
  function renderTactics() {
    const gs = ensureGS();
    const teamId = getUserTeamId();
    const wrap = document.getElementById("campo-tatico");
    const banco = document.getElementById("banco-jogadores");
    const selForm = document.getElementById("select-formacao");

    if (!wrap || !banco || !selForm) return;

    clear(wrap);
    clear(banco);
    selForm.innerHTML = "";

    // opções de formação
    const formacoes = ["4-4-2", "4-3-3", "3-5-2", "4-2-3-1", "5-3-2", "4-1-4-1"];
    formacoes.forEach(f => {
      const o = document.createElement("option");
      o.value = f; o.textContent = f;
      if (String(gs.formacao) === String(f)) o.selected = true;
      selForm.appendChild(o);
    });
    selForm.onchange = () => { gs.formacao = selForm.value; };

    if (!teamId) {
      wrap.appendChild(el("div", "mini-muted", "Nenhum time selecionado."));
      return;
    }

    const all = getTeamPlayers(teamId).slice();

    // ordena por posição e depois OVR
    all.sort((a, b) => {
      const pa = String(a.pos || a.position || "");
      const pb = String(b.pos || b.position || "");
      if (pa !== pb) return pa.localeCompare(pb);
      return n(b.ovr ?? b.overall, 0) - n(a.ovr ?? a.overall, 0);
    });

    const titularesSet = new Set((gs.titulares || []).map(x => String(x?.playerId || x?.id || x)));

    // grade dos titulares (lista estilo "escalação")
    const grid = el("div", "tactic-grid");
    const hdr = el("div", "tactic-row tactic-head");
    ["Titular", "Jogador", "Pos", "OVR", "Status"].forEach(t => hdr.appendChild(el("div", "tcell", t)));
    grid.appendChild(hdr);

    all.forEach(p => {
      const pid = String(p.id);
      const f = fitnessOf(pid);
      const available = isAvailable(pid);

      const row = el("div", "tactic-row");
      if (!available) row.classList.add("tactic-disabled");

      // checkbox titular
      const cCell = el("div", "tcell tcell-check");
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.checked = titularesSet.has(pid);
      chk.disabled = !available; // BLOQUEIA indisponíveis
      chk.onchange = () => {
        if (chk.checked) { titularesSet.add(pid); }
        else { titularesSet.delete(pid); }
        previewTitularesInfo(grid, titularesSet);
      };
      cCell.appendChild(chk);
      row.appendChild(cCell);

      // jogador
      const jCell = el("div", "tcell tcell-jog");
      const face = el("img", "face");
      face.src = `assets/faces/${pid}.png`;
      face.alt = p.name || p.nome || ("Jogador " + pid);
      face.onerror = () => { face.src = "assets/faces/default.png"; };
      const nm = el("div", "nome", p.name || p.nome || ("Jogador " + pid));
      jCell.appendChild(face);
      jCell.appendChild(nm);
      row.appendChild(jCell);

      // pos
      row.appendChild(el("div", "tcell tcell-pos", String(p.pos || p.position || "—")));

      // ovr
      row.appendChild(el("div", "tcell tcell-ovr", String(n(p.ovr ?? p.overall, 0))));

      // status
      const status = el("div", "tcell tcell-status");
      if (f.injuryWeeks > 0) status.appendChild(el("span", "badge badge-injury", `LESIONADO (${f.injuryWeeks} sem.)`));
      if (f.suspended) status.appendChild(el("span", "badge badge-susp", "SUSPENSO"));
      const fat = el("span", "badge badge-fatigue", `FADIGA ${n(f.fatigue, 0)}%`);
      const fp = n(f.fatigue, 0);
      if (fp >= 80) fat.classList.add("badge-red");
      else if (fp >= 60) fat.classList.add("badge-amber");
      status.appendChild(fat);

      if (available && f.injuryWeeks === 0 && !f.suspended) {
        // marca como OK se saudável e disponível
        if (fp < 60) status.appendChild(el("span", "badge badge-ok", "OK"));
      }

      row.appendChild(status);

      grid.appendChild(row);
    });

    wrap.appendChild(grid);

    // Banco informativo
    banco.appendChild(el("div", "mini-muted", "Marque 11 titulares. Jogadores indisponíveis ficam travados."));

    // Preview contagem
    previewTitularesInfo(grid, titularesSet);
    // sincroniza com gs (sem salvar oficialmente até o botão SALVAR)
    gs.__tacticsPreviewSet = titularesSet;
  }

  function previewTitularesInfo(grid, set) {
    // Remove linha de preview antiga
    const old = grid.querySelector(".tactic-preview");
    if (old) old.remove();

    const row = el("div", "tactic-row tactic-preview");
    const count = set.size;
    const badge = el("div", "tcell tcell-preview", `Selecionados: ${count} / 11`);
    badge.style.gridColumn = "1 / span 5";
    row.appendChild(badge);

    grid.appendChild(row);
  }

  // -----------------------------
  // Salvar
  // -----------------------------
  function salvarTaticas() {
    const gs = ensureGS();
    const tmp = gs.__tacticsPreviewSet || new Set(gs.titulares.map(x => String(x?.playerId || x?.id || x)));

    if (tmp.size !== 11) {
      alert(`Você precisa selecionar exatamente 11 titulares (atual: ${tmp.size}).`);
      return;
    }

    // Garante que nenhum indisponível entrou (defesa adicional)
    for (const pid of tmp) {
      if (!isAvailable(pid)) {
        alert("Há jogador indisponível (lesionado/suspenso) entre os selecionados. Ajuste os titulares.");
        return;
      }
    }

    // Salva
    gs.titulares = Array.from(tmp).map(id => ({ id }));
    gs.formacao = document.getElementById("select-formacao")?.value || gs.formacao || "4-4-2";

    try { if (window.Save && typeof Save.salvar === "function") Save.salvar(); } catch (e) {}

    alert("Táticas salvas com sucesso!");
  }

  // Expor API
  window.TacticsUI = {
    renderTactics,
    salvarTaticas
  };
})();