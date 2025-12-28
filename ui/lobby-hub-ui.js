/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/lobby-hub-ui.js — Match Hub AAA (SM26-like) no Lobby
   -------------------------------------------------------
   Regras:
   - NÃO mexe na capa do jogo (inviolável).
   - Injeta um HUB dentro do lobby se encontrar um container.
   - Mobile-first, visual AAA (blur, cards, badges).
   - Usa logos/fundos/faces já existentes no Database.

   Como funciona:
   - Procura um container do Lobby:
     • #tela-lobby, #lobby, .tela-lobby, body (fallback)
   - Cria um bloco #vf-lobby-hub
   - Renderiza:
     • Próximo jogo (Calendar.getProximoJogoDoUsuario)
     • Botões: Jogar / Táticas / Mercado / Treino / Calendário
     • Forma/moral/fadiga agregadas (se Training/Fitness existir)
     • Top jogadores (faces)
     • Último pós-jogo (se PostMatch existir)

   Dependências opcionais:
   - Calendar.getProximoJogoDoUsuario()
   - Database.teams / Database.players
   - Training.getTeamSummary() (se existir) ou gameState.training.playerState
   - Fitness.getTeamSummary() (se existir) ou Fitness.getPlayer()
   - PostMatch.getLast() + PostMatchUI (já fizemos antes)
   - SeasonCalendarUI.open()

   =======================================================*/

(function () {
  console.log("%c[LobbyHub] lobby-hub-ui.js carregado (AAA)", "color:#a78bfa; font-weight:bold;");

  // -----------------------------
  // CSS
  // -----------------------------
  function injectCssOnce() {
    if (document.getElementById("vf-lobbyhub-css")) return;
    const s = document.createElement("style");
    s.id = "vf-lobbyhub-css";
    s.textContent = `
      .vf-hub-wrap{
        margin: 12px 0;
      }
      .vf-hub{
        border-radius: 20px;
        border: 1px solid rgba(255,255,255,.10);
        background: radial-gradient(1200px 600px at 20% 10%, rgba(167,139,250,.16), transparent 52%),
                    radial-gradient(1200px 600px at 80% 0%, rgba(34,197,94,.12), transparent 60%),
                    rgba(0,0,0,.30);
        box-shadow: 0 16px 40px rgba(0,0,0,.35);
        overflow: hidden;
      }

      .vf-hub-top{
        padding: 12px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        border-bottom: 1px solid rgba(255,255,255,.08);
        backdrop-filter: blur(10px);
        background: rgba(0,0,0,.22);
      }
      .vf-hub-title{
        display:flex;
        flex-direction:column;
        gap:2px;
        min-width:0;
      }
      .vf-hub-title .t{
        font-weight:1000;
        letter-spacing:.6px;
        text-transform: uppercase;
        font-size: 12px;
        opacity:.92;
      }
      .vf-hub-title .s{
        font-weight:900;
        font-size:12px;
        opacity:.75;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }

      .vf-hub-actions{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
        justify-content:flex-end;
      }

      .vf-btn{
        border-radius: 14px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        color: rgba(255,255,255,.92);
        font-weight:1000;
        padding: 10px 12px;
        cursor:pointer;
        letter-spacing:.2px;
      }
      .vf-btn.primary{ background: rgba(34,197,94,.18); }
      .vf-btn.blue{ background: rgba(96,165,250,.18); }
      .vf-btn.pink{ background: rgba(251,113,133,.18); }
      .vf-btn.purple{ background: rgba(167,139,250,.18); }

      .vf-hub-grid{
        display:grid;
        grid-template-columns: 1.15fr .85fr;
        gap: 12px;
        padding: 12px;
      }
      @media(max-width:980px){
        .vf-hub-grid{ grid-template-columns: 1fr; }
      }

      .vf-card{
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(0,0,0,.30);
        box-shadow: 0 12px 28px rgba(0,0,0,.30);
        overflow:hidden;
      }
      .vf-card .hd{
        padding: 10px 12px;
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        border-bottom: 1px solid rgba(255,255,255,.07);
        background: rgba(0,0,0,.20);
        backdrop-filter: blur(10px);
      }
      .vf-card .hd .t{
        font-weight:1000;
        letter-spacing:.6px;
        text-transform:uppercase;
        font-size:12px;
        opacity:.92;
      }
      .vf-card .bd{
        padding: 12px;
      }

      .vf-pill{
        display:inline-flex;
        align-items:center;
        gap:8px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(255,255,255,.06);
        font-weight:1000;
        font-size:11px;
        letter-spacing:.2px;
      }
      .vf-pill.ok{ color:#86efac; }
      .vf-pill.warn{ color:#fbbf24; }
      .vf-pill.bad{ color:#fb7185; }
      .vf-pill.blue{ color:#60a5fa; }
      .vf-pill.purple{ color:#a78bfa; }

      .vf-nextgame{
        position: relative;
        border-radius: 18px;
        border: 1px solid rgba(255,255,255,.10);
        overflow:hidden;
        background: rgba(0,0,0,.28);
      }
      .vf-nextgame .bg{
        position:absolute;
        inset:0;
        background-size: cover;
        background-position: center;
        filter: blur(0px);
        opacity: .40;
        transform: scale(1.04);
      }
      .vf-nextgame .shade{
        position:absolute;
        inset:0;
        background: linear-gradient(180deg, rgba(0,0,0,.25), rgba(0,0,0,.80));
      }
      .vf-nextgame .content{
        position:relative;
        padding: 12px;
        display:flex;
        flex-direction:column;
        gap:10px;
      }

      .vf-teams{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
      }
      .vf-team{
        display:flex;
        align-items:center;
        gap:10px;
        min-width:0;
      }
      .vf-logo{
        width:44px;height:44px;
        border-radius: 14px;
        background: rgba(255,255,255,.06);
        border: 1px solid rgba(255,255,255,.10);
        overflow:hidden;
        display:flex;
        align-items:center;
        justify-content:center;
        flex: 0 0 auto;
      }
      .vf-logo img{width:100%;height:100%;object-fit:cover;}
      .vf-team .name{
        font-weight:1000;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }
      .vf-team .sub{
        font-weight:900;
        font-size:12px;
        opacity:.75;
      }
      .vf-vs{
        font-weight:1000;
        opacity:.9;
        letter-spacing:1px;
        padding: 6px 10px;
        border-radius: 999px;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(0,0,0,.20);
      }

      .vf-metrics{
        display:grid;
        grid-template-columns: repeat(3, 1fr);
        gap:8px;
      }
      @media(max-width:420px){
        .vf-metrics{ grid-template-columns: 1fr; }
      }
      .vf-metric{
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(0,0,0,.22);
        padding: 10px 10px;
        display:flex;
        flex-direction:column;
        gap:4px;
      }
      .vf-metric .k{
        font-weight:1000;
        letter-spacing:.6px;
        text-transform:uppercase;
        font-size:11px;
        opacity:.85;
      }
      .vf-metric .v{
        font-weight:1000;
        font-size: 18px;
      }
      .vf-metric .s{
        font-weight:900;
        font-size: 12px;
        opacity:.75;
      }

      .vf-list{
        display:grid;
        gap: 8px;
      }
      .vf-item{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:10px;
        padding: 10px 10px;
        border-radius: 16px;
        border: 1px solid rgba(255,255,255,.08);
        background: rgba(255,255,255,.05);
      }
      .vf-item .l{
        display:flex;
        align-items:center;
        gap:10px;
        min-width:0;
      }
      .vf-face{
        width:42px;height:42px;
        border-radius: 16px;
        overflow:hidden;
        border: 1px solid rgba(255,255,255,.10);
        background: rgba(0,0,0,.25);
        flex: 0 0 auto;
      }
      .vf-face img{width:100%;height:100%;object-fit:cover;}
      .vf-item .txt{
        display:flex;
        flex-direction:column;
        gap:2px;
        min-width:0;
      }
      .vf-item .txt .name{
        font-weight:1000;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      }
      .vf-item .txt .sub{
        font-weight:900;
        font-size:12px;
        opacity:.75;
      }

      .vf-muted{opacity:.75}
      .vf-divider{height:1px;background: rgba(255,255,255,.08); margin:10px 0}
    `;
    document.head.appendChild(s);
  }

  // -----------------------------
  // Utils
  // -----------------------------
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
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

  function getTeamById(id) {
    try {
      return window.Database?.teams?.find(t => String(t.id) === String(id)) || null;
    } catch (e) { return null; }
  }

  function getPlayersByTeam(teamId) {
    try {
      return (window.Database?.players || []).filter(p => String(p.teamId) === String(teamId));
    } catch (e) { return []; }
  }

  function getTeamLogo(team) {
    if (!team) return null;
    return team.logo || team.badge || team.escudo || team.imgLogo || null;
  }

  function getTeamBackground(team) {
    if (!team) return null;
    return team.background || team.bg || team.fundo || team.wallpaper || null;
  }

  function getPlayerFace(p) {
    if (!p) return null;
    return p.face || p.photo || p.foto || p.img || p.image || p.portrait || null;
  }

  function getOVR(p) {
    return n(p?.ovr ?? p?.overall ?? p?.OVR, 70);
  }

  function getPos(p) {
    return String(p?.position || p?.posicao || p?.pos || "—").toUpperCase();
  }

  // Training summary (robusto)
  function getTrainingSummary(teamId) {
    // se houver método dedicado
    try {
      if (window.Training && typeof Training.getTeamSummary === "function") {
        const s = Training.getTeamSummary(teamId);
        if (s) return s;
      }
    } catch (e) {}

    // fallback: media de gameState.training.playerState
    const gs = ensureGS();
    const st = gs.training?.playerState || {};
    const players = getPlayersByTeam(teamId);
    if (!players.length) return { moraleAvg: 70, formAvg: 65 };

    let sumM = 0, sumF = 0, cnt = 0;
    for (const p of players) {
      const ps = st[String(p.id)];
      if (!ps) continue;
      sumM += n(ps.morale, 70);
      sumF += n(ps.form, 65);
      cnt++;
    }
    if (!cnt) return { moraleAvg: 70, formAvg: 65 };
    return {
      moraleAvg: Math.round(sumM / cnt),
      formAvg: Math.round(sumF / cnt)
    };
  }

  // Fitness summary (robusto)
  function getFitnessSummary(teamId) {
    try {
      if (window.Fitness && typeof Fitness.getTeamSummary === "function") {
        const s = Fitness.getTeamSummary(teamId);
        if (s) return s;
      }
    } catch (e) {}

    const players = getPlayersByTeam(teamId);
    if (!players.length) return { fatigueAvg: 15, injured: 0 };

    let sumFat = 0, cnt = 0, injured = 0;
    for (const p of players) {
      let fp = null;
      try {
        if (window.Fitness && typeof Fitness.getPlayer === "function") fp = Fitness.getPlayer(p.id);
        if (window.Fitness && typeof Fitness.ensurePlayer === "function") fp = Fitness.ensurePlayer(p.id);
      } catch (e) {}

      const fat = n(fp?.fatigue, 15);
      sumFat += fat;
      cnt++;
      if (n(fp?.injuryWeeks, 0) > 0) injured++;
    }
    return {
      fatigueAvg: Math.round(sumFat / Math.max(1, cnt)),
      injured
    };
  }

  function moodPillClass(val) {
    const v = n(val, 0);
    if (v >= 76) return "ok";
    if (v >= 66) return "warn";
    return "bad";
  }
  function fatiguePillClass(val) {
    const v = n(val, 0);
    if (v <= 35) return "ok";
    if (v <= 60) return "warn";
    return "bad";
  }

  // Próximo jogo
  function getNextGame() {
    try {
      if (window.Calendar && typeof Calendar.getProximoJogoDoUsuario === "function") {
        return Calendar.getProximoJogoDoUsuario();
      }
    } catch (e) {}
    return null;
  }

  function normalizeGame(g) {
    if (!g) return null;
    const homeId = g.homeId ?? g.casaId ?? g.home ?? g.timeCasa ?? g.homeTeamId;
    const awayId = g.awayId ?? g.foraId ?? g.away ?? g.timeFora ?? g.awayTeamId;
    const comp = g.comp || g.competition || g.tournament || g.campeonato || "Competição";
    const round = g.round ?? g.rodada ?? g.fase ?? g.stage ?? "";
    const dateISO = g.dateISO ?? g.iso ?? g.dataISO ?? g.date ?? g.data ?? null;
    return { homeId, awayId, comp, round, dateISO };
  }

  function formatDateShort(iso) {
    if (!iso) return "Data a definir";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "Data a definir";
    return d.toLocaleDateString();
  }

  // -----------------------------
  // DOM attach
  // -----------------------------
  function findLobbyRoot() {
    return document.getElementById("tela-lobby")
      || document.getElementById("lobby")
      || document.querySelector(".tela-lobby")
      || document.body;
  }

  function isLobbyVisible() {
    const root = document.getElementById("tela-lobby") || document.getElementById("lobby") || document.querySelector(".tela-lobby");
    if (!root) return true; // fallback
    const st = window.getComputedStyle(root);
    if (!st) return true;
    return st.display !== "none" && st.visibility !== "hidden" && st.opacity !== "0";
  }

  function ensureHub() {
    injectCssOnce();

    const root = findLobbyRoot();
    if (!root) return null;

    let wrap = document.getElementById("vf-lobby-hub-wrap");
    if (!wrap) {
      wrap = el("div", "vf-hub-wrap");
      wrap.id = "vf-lobby-hub-wrap";

      // tenta inserir no topo do lobby sem quebrar layout
      // se tiver header/capa, insere depois do primeiro filho
      if (root.firstElementChild && root.firstElementChild.nextSibling) {
        root.insertBefore(wrap, root.firstElementChild.nextSibling);
      } else {
        root.insertBefore(wrap, root.firstChild);
      }
    }

    let hub = document.getElementById("vf-lobby-hub");
    if (!hub) {
      hub = el("div", "vf-hub");
      hub.id = "vf-lobby-hub";
      wrap.appendChild(hub);
    }

    return hub;
  }

  // -----------------------------
  // Render blocks
  // -----------------------------
  function renderTop(hub, teamName) {
    const top = el("div", "vf-hub-top");

    const title = el("div", "vf-hub-title");
    title.appendChild(el("div", "t", "MATCH HUB"));
    title.appendChild(el("div", "s", teamName ? `Central do clube — ${teamName}` : "Central do clube"));

    const actions = el("div", "vf-hub-actions");

    const btnPlay = el("button", "vf-btn primary", "Jogar");
    btnPlay.onclick = () => {
      try {
        if (window.Match && typeof Match.iniciarProximoJogo === "function") Match.iniciarProximoJogo();
        else alert("Match engine não encontrado.");
      } catch (e) { alert("Falha ao iniciar jogo."); }
    };

    const btnTactics = el("button", "vf-btn purple", "Táticas");
    btnTactics.onclick = () => {
      try {
        if (typeof mostrarTela === "function") mostrarTela("tela-taticas");
        else alert("Tela de táticas não encontrada.");
      } catch (e) {}
    };

    const btnMarket = el("button", "vf-btn blue", "Mercado");
    btnMarket.onclick = () => {
      try {
        if (typeof mostrarTela === "function") mostrarTela("tela-mercado");
        else if (window.UI && typeof UI.abrirMercado === "function") UI.abrirMercado();
        else alert("Tela de mercado não encontrada.");
      } catch (e) {}
    };

    const btnTraining = el("button", "vf-btn", "Treino");
    btnTraining.onclick = () => {
      try {
        if (typeof mostrarTela === "function") mostrarTela("tela-treino");
        else if (window.UI && typeof UI.abrirTreino === "function") UI.abrirTreino();
        else alert("Tela de treino não encontrada.");
      } catch (e) {}
    };

    const btnCalendar = el("button", "vf-btn pink", "Calendário");
    btnCalendar.onclick = () => {
      try {
        if (window.SeasonCalendarUI && typeof SeasonCalendarUI.open === "function") SeasonCalendarUI.open();
        else alert("Calendário anual não carregou (SeasonCalendarUI).");
      } catch (e) {}
    };

    actions.appendChild(btnPlay);
    actions.appendChild(btnTactics);
    actions.appendChild(btnMarket);
    actions.appendChild(btnTraining);
    actions.appendChild(btnCalendar);

    top.appendChild(title);
    top.appendChild(actions);

    return top;
  }

  function renderNextGameCard(teamId) {
    const card = el("div", "vf-card");

    const hd = el("div", "hd");
    hd.appendChild(el("div", "t", "Próximo jogo"));

    const pill = el("div", "vf-pill blue", "Matchday");
    hd.appendChild(pill);

    const bd = el("div", "bd");

    const g = normalizeGame(getNextGame());
    if (!g) {
      bd.appendChild(el("div", "vf-muted", "Sem jogo agendado no momento (ou Calendar ainda não expôs a agenda)."));
      card.appendChild(hd);
      card.appendChild(bd);
      return card;
    }

    const home = getTeamById(g.homeId);
    const away = getTeamById(g.awayId);

    const homeLogo = getTeamLogo(home);
    const awayLogo = getTeamLogo(away);

    // fundo: prioriza fundo do seu time; se não tiver, usa do mandante
    const userTeam = getTeamById(teamId);
    const bg = getTeamBackground(userTeam) || getTeamBackground(home) || getTeamBackground(away) || null;

    const box = el("div", "vf-nextgame");
    const bgEl = el("div", "bg");
    if (bg) bgEl.style.backgroundImage = `url('${bg}')`;
    const shade = el("div", "shade");
    const content = el("div", "content");

    const topRow = el("div", "vf-pill purple", `${g.comp}${g.round ? " • " + g.round : ""} • ${formatDateShort(g.dateISO)}`);
    content.appendChild(topRow);

    const teams = el("div", "vf-teams");

    const t1 = el("div", "vf-team");
    const l1 = el("div", "vf-logo");
    if (homeLogo) {
      const img = document.createElement("img"); img.src = homeLogo;
      l1.appendChild(img);
    } else {
      l1.textContent = "🏟️";
    }
    const tx1 = el("div", "");
    tx1.style.display = "flex";
    tx1.style.flexDirection = "column";
    tx1.style.gap = "2px";
    tx1.style.minWidth = "0";
    tx1.appendChild(el("div", "name", home?.name || "Casa"));
    tx1.appendChild(el("div", "sub", String(g.homeId)));
    t1.appendChild(l1);
    t1.appendChild(tx1);

    const vs = el("div", "vf-vs", "VS");

    const t2 = el("div", "vf-team");
    const l2 = el("div", "vf-logo");
    if (awayLogo) {
      const img = document.createElement("img"); img.src = awayLogo;
      l2.appendChild(img);
    } else {
      l2.textContent = "⚽";
    }
    const tx2 = el("div", "");
    tx2.style.display = "flex";
    tx2.style.flexDirection = "column";
    tx2.style.gap = "2px";
    tx2.style.minWidth = "0";
    tx2.appendChild(el("div", "name", away?.name || "Fora"));
    tx2.appendChild(el("div", "sub", String(g.awayId)));
    t2.appendChild(l2);
    t2.appendChild(tx2);

    teams.appendChild(t1);
    teams.appendChild(vs);
    teams.appendChild(t2);

    content.appendChild(teams);

    box.appendChild(bgEl);
    box.appendChild(shade);
    box.appendChild(content);

    bd.appendChild(box);

    // dica de mando do usuário
    const isUserHome = String(teamId) === String(g.homeId);
    const where = el("div", "vf-muted");
    where.style.marginTop = "10px";
    where.textContent = isUserHome ? "Você joga em casa. Ajuste pressão/ritmo e dite o jogo." : "Você joga fora. Pense na mentalidade e no risco.";
    bd.appendChild(where);

    card.appendChild(hd);
    card.appendChild(bd);
    return card;
  }

  function renderSquadHighlights(teamId) {
    const card = el("div", "vf-card");
    const hd = el("div", "hd");
    hd.appendChild(el("div", "t", "Destaques do elenco"));
    hd.appendChild(el("div", "vf-pill", "Faces/OVR"));
    hd.querySelector(".vf-pill").classList.add("blue");

    const bd = el("div", "bd");
    const list = el("div", "vf-list");

    const players = getPlayersByTeam(teamId)
      .slice()
      .sort((a, b) => getOVR(b) - getOVR(a))
      .slice(0, 5);

    if (!players.length) {
      bd.appendChild(el("div", "vf-muted", "Sem jogadores no banco (Database.players)."));
      card.appendChild(hd);
      card.appendChild(bd);
      return card;
    }

    players.forEach(p => {
      const item = el("div", "vf-item");
      const left = el("div", "l");

      const face = el("div", "vf-face");
      const imgUrl = getPlayerFace(p);
      if (imgUrl) {
        const img = document.createElement("img");
        img.src = imgUrl;
        face.appendChild(img);
      } else {
        face.style.display = "flex";
        face.style.alignItems = "center";
        face.style.justifyContent = "center";
        face.textContent = "👤";
      }

      const txt = el("div", "txt");
      txt.appendChild(el("div", "name", (p.name || p.nome || `Jogador ${p.id}`)));
      txt.appendChild(el("div", "sub", `${getPos(p)} • OVR ${getOVR(p)}`));

      left.appendChild(face);
      left.appendChild(txt);

      const pill = el("div", "vf-pill ok", "TOP");
      item.appendChild(left);
      item.appendChild(pill);
      list.appendChild(item);
    });

    bd.appendChild(list);
    card.appendChild(hd);
    card.appendChild(bd);
    return card;
  }

  function renderStatusCard(teamId) {
    const card = el("div", "vf-card");
    const hd = el("div", "hd");
    hd.appendChild(el("div", "t", "Status do Clube"));
    hd.appendChild(el("div", "vf-pill", "Forma/Moral/Fadiga"));
    hd.querySelector(".vf-pill").classList.add("purple");

    const bd = el("div", "bd");

    const tr = getTrainingSummary(teamId);
    const ft = getFitnessSummary(teamId);

    const morale = n(tr.moraleAvg, 70);
    const form = n(tr.formAvg, 65);
    const fatigue = n(ft.fatigueAvg, 15);
    const injured = n(ft.injured, 0);

    const metrics = el("div", "vf-metrics");

    const m1 = el("div", "vf-metric");
    m1.appendChild(el("div", "k", "Moral"));
    m1.appendChild(el("div", "v", String(morale)));
    const m1p = el("div", "vf-pill " + moodPillClass(morale), morale >= 76 ? "Alta" : morale >= 66 ? "Ok" : "Baixa");
    m1.appendChild(m1p);

    const m2 = el("div", "vf-metric");
    m2.appendChild(el("div", "k", "Forma"));
    m2.appendChild(el("div", "v", String(form)));
    const m2p = el("div", "vf-pill " + moodPillClass(form), form >= 76 ? "Em alta" : form >= 66 ? "Estável" : "Em baixa");
    m2.appendChild(m2p);

    const m3 = el("div", "vf-metric");
    m3.appendChild(el("div", "k", "Fadiga"));
    m3.appendChild(el("div", "v", String(fatigue)));
    const m3p = el("div", "vf-pill " + fatiguePillClass(fatigue), fatigue <= 35 ? "Leve" : fatigue <= 60 ? "Média" : "Alta");
    m3.appendChild(m3p);

    metrics.appendChild(m1);
    metrics.appendChild(m2);
    metrics.appendChild(m3);

    bd.appendChild(metrics);

    bd.appendChild(el("div", "vf-divider"));

    const line = el("div", "vf-muted");
    line.textContent = injured > 0
      ? `Atenção: ${injured} jogador(es) lesionado(s). Ajuste o treino e a rotação.`
      : "Elenco sem lesões relevantes (ótimo para sequência de jogos).";
    bd.appendChild(line);

    card.appendChild(hd);
    card.appendChild(bd);
    return card;
  }

  function renderLastPostMatch() {
    const card = el("div", "vf-card");
    const hd = el("div", "hd");
    hd.appendChild(el("div", "t", "Último jogo"));
    hd.appendChild(el("div", "vf-pill", "Relatório"));
    hd.querySelector(".vf-pill").classList.add("blue");

    const bd = el("div", "bd");

    let rep = null;
    try {
      if (window.PostMatch && typeof PostMatch.getLast === "function") rep = PostMatch.getLast();
      else rep = window.gameState?.postMatch?.last || null;
    } catch (e) {}

    if (!rep) {
      bd.appendChild(el("div", "vf-muted", "Nenhum relatório pós-jogo ainda."));
      card.appendChild(hd);
      card.appendChild(bd);
      return card;
    }

    const score = el("div", "vf-pill ok", `${rep.homeName} ${rep.goalsHome} x ${rep.goalsAway} ${rep.awayName}`);
    bd.appendChild(score);

    const motm = rep.motm;
    const motmText = el("div", "vf-muted");
    motmText.style.marginTop = "8px";
    motmText.textContent = `MOTM: ${motm?.name || "—"} (${n(motm?.rating, 0).toFixed(1)})`;
    bd.appendChild(motmText);

    const btn = el("button", "vf-btn", "Ver relatório");
    btn.style.marginTop = "10px";
    btn.onclick = () => {
      try {
        if (window.PostMatchUI && typeof PostMatchUI.open === "function") PostMatchUI.open(rep);
        else alert("PostMatchUI não carregou.");
      } catch (e) {}
    };
    bd.appendChild(btn);

    card.appendChild(hd);
    card.appendChild(bd);
    return card;
  }

  // -----------------------------
  // Main render
  // -----------------------------
  function render() {
    if (!isLobbyVisible()) return;

    const teamId = getUserTeamId();
    if (!teamId) return;

    const team = getTeamById(teamId);
    const hub = ensureHub();
    if (!hub) return;

    // evita re-render excessivo (mas mantém atualizado)
    hub.innerHTML = "";

    const top = renderTop(hub, team?.name || null);
    hub.appendChild(top);

    const grid = el("div", "vf-hub-grid");

    // coluna esquerda
    const left = el("div", "");
    left.style.display = "grid";
    left.style.gap = "12px";
    left.appendChild(renderNextGameCard(teamId));
    left.appendChild(renderStatusCard(teamId));

    // coluna direita
    const right = el("div", "");
    right.style.display = "grid";
    right.style.gap = "12px";
    right.appendChild(renderSquadHighlights(teamId));
    right.appendChild(renderLastPostMatch());

    grid.appendChild(left);
    grid.appendChild(right);

    hub.appendChild(grid);
  }

  // -----------------------------
  // Auto loop (seguro)
  // -----------------------------
  function start() {
    injectCssOnce();
    // re-render periódico leve
    setInterval(() => {
      try { render(); } catch (e) {}
    }, 1200);
  }

  start();

  // Expor API se quiser chamar manualmente
  window.LobbyHubUI = {
    render
  };
})();