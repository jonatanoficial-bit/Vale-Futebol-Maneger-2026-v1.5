/* main.js — Orquestrador principal (ponto único de inicialização) */
(function () {
  'use strict';

  function fatalBoot(code, message, detail) {
    try {
      window.VFM26 && window.VFM26.BootCheck && window.VFM26.BootCheck.fatal(code, message, detail);
    } catch (e) {
      alert(`Erro crítico\n\n${message}\n\nCódigo: ${code}`);
      console.error(e);
    }
  }

  function boot() {
    try {
      const BootCheck = window.VFM26?.BootCheck;
      if (!BootCheck) return fatalBoot('BOOT_E00_BOOTCHECK_MISSING', 'BootCheck não encontrado.');

      BootCheck.step('MAIN_START');

      // Verificações mínimas
      const app = document.getElementById('app');
      if (!app) return BootCheck.fatal('BOOT_E02_APP_NOT_FOUND', '#app não encontrado.');

      if (!window.VFM26?.Engine) return BootCheck.fatal('BOOT_E03_ENGINE_NOT_FOUND', 'Engine não registrada.');
      if (!window.VFM26?.Game) return BootCheck.fatal('BOOT_E04_GAME_NOT_FOUND', 'Game (ponte) não registrada.');
      if (!window.VFM26?.UI) return BootCheck.fatal('BOOT_E05_UI_NOT_FOUND', 'UI não registrada.');

      BootCheck.step('ENGINE_INIT');
      window.VFM26.Engine.init();

      BootCheck.step('GAME_INIT');
      window.VFM26.Game.init();

      BootCheck.step('UI_INIT');
      window.VFM26.UI.init(app);

      BootCheck.step('ROUTE_START');
      window.VFM26.UI.go('cover');

      BootCheck.step('BOOT_OK');
      console.log('VFM26: Boot completo.');
    } catch (err) {
      fatalBoot('BOOT_E99_UNHANDLED', 'Falha inesperada no boot.', String(err && err.stack ? err.stack : err));
    }
  }

  // Anti-erro clássico: DOM não pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();