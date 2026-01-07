// /src/ui/appShell.js
export function createAppShell(root) {
  root.innerHTML = `
    <div class="app">
      <header class="topbar">
        <div class="topbar__left">
          <div class="appicon"></div>
          <div>
            <div class="topbar__title" id="topbarTitle"></div>
            <div class="topbar__subtitle" id="topbarSubtitle"></div>
          </div>
        </div>
        <div class="topbar__right">
          <span class="pill" id="topbarPill">AAA</span>
        </div>
      </header>

      <main class="main" id="main"></main>

      <footer class="footerbar">
        <div id="footerLeft"></div>
        <div id="footerRight"></div>
      </footer>

      <div class="fatal" id="fatal" aria-hidden="true">
        <div class="fatal__card card">
          <div class="card__header">
            <div>
              <div class="card__title">Ocorreu um erro</div>
              <div class="card__subtitle">Copie o log abaixo e me envie.</div>
            </div>
            <span class="badge">Erro</span>
          </div>
          <div class="card__body">
            <pre class="fatal__pre" id="fatalPre"></pre>
            <div style="height:10px"></div>
            <button class="btn btn--primary" id="fatalReload">Recarregar</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const $ = (sel) => root.querySelector(sel);

  const main = $("#main");
  const fatal = $("#fatal");
  const fatalPre = $("#fatalPre");
  const fatalReload = $("#fatalReload");

  fatalReload.addEventListener("click", () => window.location.reload());

  function setTopbar({ title, subtitle }) {
    $("#topbarTitle").textContent = title ?? "";
    $("#topbarSubtitle").textContent = subtitle ?? "";
  }

  function setFooter({ left, right }) {
    $("#footerLeft").textContent = left ?? "";
    $("#footerRight").textContent = right ?? "";
  }

  function clearMain() {
    main.innerHTML = "";
  }

  function mount(node) {
    main.appendChild(node);
  }

  function showFatal(err) {
    const payload = {
      type: "runtime",
      message: err?.message || String(err),
      stack: err?.stack || null,
      href: window.location.href,
      ua: navigator.userAgent
    };
    fatalPre.textContent = JSON.stringify(payload, null, 2);
    fatal.setAttribute("aria-hidden", "false");
    fatal.classList.add("fatal--show");
  }

  return { setTopbar, setFooter, clearMain, mount, showFatal };
}
