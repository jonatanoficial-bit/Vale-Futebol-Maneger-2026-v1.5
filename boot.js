(function () {
  'use strict';

  // Boot Steps visíveis no console
  const BOOT_STEPS = [];
  function step(s, data) {
    BOOT_STEPS.push({ t: new Date().toISOString(), s, data: data ?? null });
    // eslint-disable-next-line no-console
    console.log(`[BOOT] ${s}`, data ?? '');
  }

  function fatal(code, msg) {
    step('FATAL', { code, msg, BOOT_STEPS });
    alert(
      `Erro crítico\n\n${msg}\n\nCódigo: ${code}\n\nDebug no console (BOOT_STEPS).`
    );
    // Expondo para debug
    window.BOOT_STEPS = BOOT_STEPS;
    throw new Error(`${code}: ${msg}`);
  }

  function onReady(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      fn();
      return;
    }
    document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  onReady(() => {
    try {
      step('BOOT_START');

      // 1) DOM pronto
      const app = document.getElementById('app');
      if (!app) {
        fatal('BOOT_E01_DOM_NOT_READY', 'DOM não está pronto ou #app não existe.');
      }
      step('DOM_OK');

      // 2) Namespace
      if (!window.VFM26) {
        window.VFM26 = {};
      }
      step('NS_OK');

      // 3) Engine opcional (se existir, valida)
      //    Seu projeto pode ter Engine, mas se não tiver, não bloqueia.
      if (window.VFM26.Engine) {
        step('ENGINE_FOUND');
      } else {
        step('ENGINE_NOT_FOUND_OK');
      }

      // 4) Game obrigatório
      if (!window.VFM26.Game) {
        fatal(
          'BOOT_E04_GAME_NOT_FOUND',
          'Game (ponte) não registrada. Verifique se game.js está sendo carregado ANTES do boot.js e se o caminho do <script> está correto.'
        );
      }
      step('GAME_OK');

      // 5) UI obrigatória (precisa ter um ponto de entrada)
      //    Suporta dois padrões: VFM26.UI.start() ou VFM26.UI.init()
      const UI = window.VFM26.UI;

      if (!UI) {
        fatal(
          'BOOT_E05_UI_NOT_FOUND',
          'UI não registrada. Verifique se ui/ui.js está carregando e registrando window.VFM26.UI.'
        );
      }

      const startFn = UI.start || UI.init;
      if (typeof startFn !== 'function') {
        fatal(
          'BOOT_E06_UI_START_NOT_FOUND',
          'UI encontrada, mas não existe UI.start() nem UI.init().'
        );
      }

      step('UI_OK');

      // 6) Inicia app
      startFn.call(UI, { mountId: 'app' });
      step('APP_STARTED');

      // expõe steps para debug
      window.BOOT_STEPS = BOOT_STEPS;
      step('BOOT_DONE');
    } catch (e) {
      // se já caiu em fatal, não precisa duplicar
      if (!window.BOOT_STEPS) window.BOOT_STEPS = BOOT_STEPS;
      // eslint-disable-next-line no-console
      console.error(e);
    }
  });
})();