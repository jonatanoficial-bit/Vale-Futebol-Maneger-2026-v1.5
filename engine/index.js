/* engine/index.js — Registro da Engine (obrigatório) */
(function () {
  'use strict';

  const NS = (window.VFM26 = window.VFM26 || {});
  const BootCheck = NS.BootCheck;

  const Engine = {
    version: '1.2.0',

    init() {
      BootCheck && BootCheck.step('ENGINE_REGISTER_MODULES');

      // Validar dependências mínimas
      if (!NS.EngineCore) throw new Error('EngineCore ausente (engine/gameCore.js)');
      if (!NS.EngineCore.createBaseWorld) throw new Error('EngineCore.createBaseWorld ausente');

      // Aqui a engine poderia fazer warmup futuro.
      BootCheck && BootCheck.step('ENGINE_OK');
    }
  };

  NS.Engine = Engine;
})();