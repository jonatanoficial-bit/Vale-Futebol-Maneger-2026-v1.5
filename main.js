(function () {
  const NS = (window.VFM26 = window.VFM26 || {});

  const BOOT_STEPS = [];
  window.BOOT_STEPS = BOOT_STEPS;

  function step(msg, ok = true) {
    BOOT_STEPS.push({ t: new Date().toISOString(), ok, msg });
    // eslint-disable-next-line no-console
    console[ok ? 'log' : 'error']('[BOOT]', msg);
  }

  async function boot() {
    try {
      step('DOM pronto');
      if (!NS.BootCheck) throw new Error('BootCheck não encontrado');
      NS.BootCheck.assertDOMReady();

      step('Engine encontrado');
      if (!NS.Engine) throw new Error('Engine não registrado');

      step('Game encontrado');
      if (!NS.Game) throw new Error('Game (ponte) não registrada');

      step('UI encontrada');
      if (!NS.UI) throw new Error('UI não registrada');

      step('Iniciando UI.start()');
      NS.UI.start();

      step('OK - UI iniciada com sucesso');
    } catch (err) {
      step(`Falha no boot: ${err && err.message ? err.message : String(err)}`, false);
      if (NS.UI && typeof NS.UI.showCriticalError === 'function') {
        NS.UI.showCriticalError(err);
      } else {
        alert('Erro crítico no boot: ' + (err && err.message ? err.message : String(err)));
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();