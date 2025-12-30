(function () {
  const UI = {
    mount: null,

    init() {
      this.mount = document.getElementById("app");
      NS.bootAssert(this.mount, "Elemento #app não encontrado", "BOOT_E02_UI_NOT_READY");
      NS.bootStep("UI.init OK");
    },

    go() {
      this.renderHome();
      NS.bootStep("UI.go OK");
    },

    clear() {
      this.mount.innerHTML = "";
    },

    renderHome() {
      this.clear();

      const h1 = document.createElement("h1");
      h1.textContent = "VALE FUTEBOL MANAGER 2026";

      const p = document.createElement("p");
      p.textContent =
        "Simulador de futebol manager. Base sólida pronta. Agora: DataPack e Saves.";

      const btn = document.createElement("button");
      btn.textContent = "INICIAR";
      btn.onclick = () => NS.Game?.startCareerFlow();

      this.mount.append(h1, p, btn);
    }
  };

  NS.UI = UI;
  NS.bootStep("UI registrada");
})();