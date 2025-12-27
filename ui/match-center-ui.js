/* =======================================================
   VALE FUTEBOL MANAGER 2026
   Ui/match-center-ui.js — Match Center AAA (HUD + barras + destaques)
   -------------------------------------------------------
   O Match (engine/match.js) já atualiza números em:
     #mc-posse-home, #mc-posse-away,
     #mc-chutes-home, #mc-chutes-away,
     #mc-alvo-home, #mc-alvo-away,
     #mc-xg-home, #mc-xg-away,
     #mc-esc-home, #mc-esc-away,
     #mc-faltas-home, #mc-faltas-away
   e placar em #gols-home / #gols-away.

   Este UI adiciona:
   - Barras de posse e xG (animadas)
   - Highlight de gol (flash no placar)
   - Estilo AAA no painel (sem mexer no HTML)
   - Observador que se adapta ao que existir na tela
   -------------------------------------------------------
   API:
   - MatchCenterUI.ensure()
   - MatchCenterUI.bind()
   - MatchCenterUI.unbind()
   =======================================================*/

(function () {
  console.log("%c[MatchCenterUI] match-center-ui.js carregado", "color:#38bdf8; font-weight:bold;");

  // -----------------------------
  // CSS AAA injetado
  // -----------------------------
  function injectCssOnce() {
    if (document.getElementById("vf-matchcenter-css")) return;
    const style = document.createElement("style");
    style.id = "vf-matchcenter-css";
    style.textContent = `
      .mc-card{
        background: rgba(0,0,0,.35);
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 18px;
        padding: 12px;
        box-shadow: 0 10px 30px rgba(0,0,0,.25);
      }
      .mc-title{
        font-weight:1000;
        letter-spacing:.6px;
        text-transform:uppercase;
        font-size:12px;
        opacity:.9;
        margin:0 0 10px 0;
      }
      .mc-bars{display:grid; gap:10px; margin:10px 0}
      .mc-bar{
        height: 12px;
        border-radius: 999px;
        background: rgba(255,255,255,.08);
        overflow:hidden;
        border: 1px solid rgba(255,255,255,.08);
      }
      .mc-fill{
        height:100%;
        width:0%;
        transition: width .22s ease;
      }
      .mc-row{
        display:flex; align-items:center; justify-content:space-between;
        gap:10px; font-weight:900; opacity:.92
      }
      .mc-row .k{opacity:.75; font-size:12px; font-weight:1000}
      .mc-row .v{font-weight:1000}

      .vf-flash{
        animation: vfFlash .45s ease-out;
      }
      @keyframes vfFlash{
        0%{transform:scale(1); filter:brightness(1)}
        30%{transform:scale(1.05); filter:brightness(1.25)}
        100%{transform:scale(1); filter:brightness(1)}
      }
    `;
    document.head.appendChild(style);
  }

  // -----------------------------
  // Helpers
  // -----------------------------
  function byId(id) { return document.getElementById(id); }
  function n(v, d = 0) { const x = Number(v); return isNaN(x) ? d : x; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // -----------------------------
  // Build Bars (posse + xG)
  // -----------------------------
  let bound = false;
  let timer = null;

  function ensureBars() {
    injectCssOnce();

    // tenta achar um container do match center
    // Se o seu HTML já tem um painel, ótimo. Se não, não cria nada invasivo.
    const root = byId("match-center") || byId("painel-match-center") || byId("mc-root");
    if (!root) return;

    // se já criou, não repete
    if (root.querySelector(".mc-bars")) return;

    // cria uma área de barras no topo do painel
    const card = document.createElement("div");
    card.className = "mc-card";

    const title = document.createElement("div");
    title.className = "mc-title";
    title.textContent = "MATCH CENTER";
    card.appendChild(title);

    const bars = document.createElement("div");
    bars.className = "mc-bars";

    // posse
    const posseLabel = document.createElement("div");
    posseLabel.className = "mc-row";
    posseLabel.innerHTML = `<div class="k">POSSE</div><div class="v" id="mc-bar-posse-txt">—</div>`;
    bars.appendChild(posseLabel);

    const posseBar = document.createElement("div");
    posseBar.className = "mc-bar";
    posseBar.innerHTML = `<div class="mc-fill" id="mc-bar-posse-fill"></div>`;
    bars.appendChild(posseBar);

    // xG
    const xgLabel = document.createElement("div");
    xgLabel.className = "mc-row";
    xgLabel.innerHTML = `<div class="k">xG</div><div class="v" id="mc-bar-xg-txt">—</div>`;
    bars.appendChild(xgLabel);

    const xgBar = document.createElement("div");
    xgBar.className = "mc-bar";
    xgBar.innerHTML = `<div class="mc-fill" id="mc-bar-xg-fill"></div>`;
    bars.appendChild(xgBar);

    card.appendChild(bars);

    // coloca no topo
    root.prepend(card);

    // define cores por inline (sem setar “tema”, apenas preenchimento)
    const posseFill = byId("mc-bar-posse-fill");
    const xgFill = byId("mc-bar-xg-fill");
    if (posseFill) posseFill.style.background = "rgba(96,165,250,.85)";
    if (xgFill) xgFill.style.background = "rgba(251,191,36,.85)";
  }

  // -----------------------------
  // Update Loop
  // -----------------------------
  let lastGH = null;
  let lastGA = null;

  function readText(id) {
    const el = byId(id);
    return el ? String(el.textContent || "").trim() : "";
  }

  function updateBars() {
    // posse
    const phTxt = readText("mc-posse-home"); // ex: "52%"
    const paTxt = readText("mc-posse-away");
    const ph = clamp(n(phTxt.replace("%", ""), 50), 0, 100);
    const pa = clamp(n(paTxt.replace("%", ""), 50), 0, 100);

    const posseFill = byId("mc-bar-posse-fill");
    const posseTxt = byId("mc-bar-posse-txt");
    if (posseFill) posseFill.style.width = `${ph}%`;
    if (posseTxt) posseTxt.textContent = `${Math.round(ph)}% x ${Math.round(pa)}%`;

    // xG
    const xhTxt = readText("mc-xg-home");
    const xaTxt = readText("mc-xg-away");
    const xh = clamp(n(xhTxt, 0), 0, 10);
    const xa = clamp(n(xaTxt, 0), 0, 10);

    // barra xG proporcional (máximo = maior xG * 100)
    const max = Math.max(0.2, xh + xa, Math.max(xh, xa));
    const xhPct = clamp((xh / max) * 100, 0, 100);

    const xgFill = byId("mc-bar-xg-fill");
    const xgTxt = byId("mc-bar-xg-txt");
    if (xgFill) xgFill.style.width = `${xhPct}%`;
    if (xgTxt) xgTxt.textContent = `${xh.toFixed(2)} x ${xa.toFixed(2)}`;

    // gol flash
    const gh = n(readText("gols-home"), 0);
    const ga = n(readText("gols-away"), 0);

    if (lastGH == null) lastGH = gh;
    if (lastGA == null) lastGA = ga;

    if (gh !== lastGH || ga !== lastGA) {
      const a = byId("gols-home");
      const b = byId("gols-away");
      if (a) { a.classList.remove("vf-flash"); void a.offsetWidth; a.classList.add("vf-flash"); }
      if (b) { b.classList.remove("vf-flash"); void b.offsetWidth; b.classList.add("vf-flash"); }
      lastGH = gh;
      lastGA = ga;
    }
  }

  // -----------------------------
  // Bind / Unbind
  // -----------------------------
  function bind() {
    if (bound) return;
    bound = true;

    ensureBars();
    updateBars();

    timer = setInterval(() => {
      ensureBars(); // se abrir a tela depois, cria na hora
      updateBars();
    }, 220);
  }

  function unbind() {
    bound = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  // auto-bind quando existir Match e a tela partida aparecer
  function autoBindWatcher() {
    // Observa troca de telas: se "tela-partida" estiver ativa, liga.
    const tick = () => {
      const tp = byId("tela-partida");
      const active = tp && tp.classList.contains("ativa");
      if (active) bind();
      else unbind();
    };
    setInterval(tick, 350);
  }

  // init imediato
  autoBindWatcher();

  window.MatchCenterUI = {
    ensure: ensureBars,
    bind,
    unbind
  };
})();