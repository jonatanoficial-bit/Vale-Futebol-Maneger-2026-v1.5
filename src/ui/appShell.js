export function createAppShell(root) {
  root.innerHTML = `
    <div class="app">
      <header class="topbar">
        <div class="topbar__left">
          <div class="brandMark"></div>
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

      <footer class="footer">
        <div class="footer__left" id="footerLeft"></div>
        <div class="footer__right" id="footerRight"></div>
      </footer>

      <div class="fatal" id="fatal" aria-hidden="true">
        <div class="fatal__card">
          <div class="fatal__title">Ocorreu um erro</div>
          <div class="fatal__desc">Copie o log abaixo e me envie.</div>
          <pre class="fatal__pre" id="fatalPre"></pre>
          <button class="btn btn--primary" id="fatalReload">Recarregar</button>
        </div>
      </div>
    </div>
  `;

  const $ = (id) => root.querySelector(id);

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
      message: err?.message || String(err),
      stack: err?.stack || null,
      href: window.location.href
    };
    fatalPre.textContent = JSON.stringify(payload, null, 2);
    fatal.setAttribute("aria-hidden", "false");
    fatal.classList.add("fatal--show");
  }

  return { setTopbar, setFooter, clearMain, mount, showFatal };
}