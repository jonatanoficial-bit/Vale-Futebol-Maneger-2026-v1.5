(() => {
  // Namespace base
  window.VFM26 = window.VFM26 || {};
  const NS = window.VFM26;

  // Boot steps para debug
  NS.BOOT_STEPS = [];
  NS.bootStep = function bootStep(msg, data) {
    try {
      const entry = {
        t: new Date().toISOString(),
        msg: String(msg),
        data: data ?? null
      };
      NS.BOOT_STEPS.push(entry);
      // Mantém acessível no console
      // eslint-disable-next-line no-console
      console.log("[BOOT]", entry.msg, entry.data || "");
    } catch (_) {}
  };

  NS.fatal = function fatal(title, detail, code) {
    try {
      const overlay = document.createElement("div");
      overlay.className = "boot-fatal";
      overlay.innerHTML = `
        <div class="box">
          <h2>ERRO CRÍTICO</h2>
          <p><strong>${escapeHtml(title)}</strong></p>
          ${detail ? `<p>${escapeHtml(detail)}</p>` : ""}
          ${code ? `<p>Código: <code>${escapeHtml(code)}</code></p>` : ""}
          <p>Abra o console e procure por <code>VFM26.BOOT_STEPS</code>.</p>
          <div style="margin-top:12px;display:flex;justify-content:flex-end;">
            <button class="vfm-btn vfm-btn-ghost" id="bootOk">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
      const btn = overlay.querySelector("#bootOk");
      if (btn) btn.onclick = () => overlay.remove();

      // também alerta (mobile)
      alert(
        `${title}\n\n${detail ? detail + "\n\n" : ""}${
          code ? "Código: " + code + "\n\n" : ""
        }Debug no console (VFM26.BOOT_STEPS).`
      );
    } catch (e) {
      alert(`${title}\n${detail || ""}\n${code || ""}`);
    }
  };

  NS.bootAssert = function bootAssert(cond, title, detail, code) {
    if (!cond) {
      NS.bootStep("ASSERT_FAIL: " + title, { detail, code });
      NS.fatal(title, detail, code);
      throw new Error(code || title);
    }
  };

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  NS.bootStep("BootCheck pronto");
})();