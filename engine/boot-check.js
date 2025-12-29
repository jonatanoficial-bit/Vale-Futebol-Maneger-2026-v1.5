/* engine/boot-check.js — verificação de boot + erros (obrigatório) */
(function () {
  'use strict';

  const NS = (window.VFM26 = window.VFM26 || {});
  const steps = [];

  function safeString(v) {
    try { return String(v); } catch { return '[unprintable]'; }
  }

  const BootCheck = {
    steps,

    step(name) {
      const s = { at: Date.now(), name: safeString(name) };
      steps.push(s);
      // Debug útil no console:
      try { console.log('[BOOT_STEP]', s.name); } catch (_) {}
    },

    fatal(code, message, detail) {
      const msg = safeString(message || 'Erro crítico');
      const c = safeString(code || 'BOOT_E_UNKNOWN');
      const d = detail ? safeString(detail) : '';

      console.error('[BOOT_FATAL]', { code: c, message: msg, detail: d, steps: steps.slice() });

      // Sempre diagnosticar. Nunca tela preta.
      alert(
        `Erro crítico\n\n${msg}\n\nCódigo: ${c}\n\n` +
        `Debug no console (BOOT_STEPS).`
      );

      // Também desenha uma tela de erro no app, se existir
      try {
        const app = document.getElementById('app');
        if (app) {
          app.innerHTML = `
            <div style="width:min(920px,96vw);margin:24px auto;padding:18px;border-radius:18px;
                        background:rgba(0,0,0,.55);border:1px solid rgba(255,59,59,.45);
                        color:#fff;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
              <div style="font-weight:900;letter-spacing:.3px;text-transform:uppercase;color:#ff6b6b;">
                ERRO CRÍTICO
              </div>
              <div style="margin-top:10px;font-size:14px;line-height:1.45;">
                <div><b>${msg}</b></div>
                <div style="margin-top:6px;opacity:.9;">Código: <span style="font-family:ui-monospace,Menlo,Consolas,monospace;">${c}</span></div>
                ${d ? `<div style="margin-top:10px;opacity:.85;white-space:pre-wrap;">${d}</div>` : ``}
              </div>
              <div style="margin-top:12px;opacity:.82;font-size:12px;">
                Abra o console e procure por <b>BOOT_STEPS</b>.
              </div>
            </div>
          `;
        }
      } catch (_) {}

      // Expor no console
      try { window.BOOT_STEPS = steps.slice(); } catch (_) {}
    },

    assertDOMReady() {
      if (document.readyState === 'loading') {
        this.fatal('BOOT_E01_DOM_NOT_READY', 'DOM não está pronto.', 'Espere DOMContentLoaded antes de inicializar.');
        return false;
      }
      return true;
    }
  };

  NS.BootCheck = BootCheck;
  BootCheck.step('BOOTCHECK_READY');
})();