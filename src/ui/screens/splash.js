export function screenSplash(ctx) {
  const { store, navigate } = ctx;

  const isGithubPages =
    typeof window !== "undefined" &&
    /github\.io$/i.test(window.location.hostname || "");

  return {
    title: "Vale Futebol Manager",

    template() {
      // IMPORTANT:
      // Use <a href="#/..."> as a fallback so navigation still works
      // even if some runtime error prevents JS handlers from attaching.
      return `
        <section class="screen">
          <div class="card">
            <h1 class="title">Modo Carreira</h1>
            <p class="muted">
              Construa sua história como Treinador. Atualizações via Pacotes de Dados (DLC) sem mexer no código.
            </p>

            <div class="stack">
              <a class="btn btn--primary" id="btnStart" href="#/dataPackSelect">Iniciar</a>
              <a class="btn" id="btnAdmin" href="#/diagnostics">Admin</a>
            </div>

            <div class="footnote">
              Offline • ${isGithubPages ? "GitHub Pages" : "Web"} • v1.5
            </div>
          </div>
        </section>
      `;
    },

    onMount(el) {
      const btnStart = el.querySelector("#btnStart");
      const btnAdmin = el.querySelector("#btnAdmin");

      btnStart?.addEventListener("click", (ev) => {
        // Se o JS estiver ok, fazemos o fluxo inteligente:
        // - Se já tem DLC selecionado, vai direto pro start
        // - Se não, força escolher pacote de dados
        ev.preventDefault();

        const st = store?.getState?.();
        const selected = st?.dlc?.selectedPackId;

        if (selected) {
          navigate("#/start");
          return;
        }

        navigate("#/dataPackSelect");
      });

      btnAdmin?.addEventListener("click", (ev) => {
        ev.preventDefault();
        navigate("#/diagnostics");
      });
    },
  };
}