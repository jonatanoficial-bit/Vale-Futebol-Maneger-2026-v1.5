/*
  main.js
  ---------------------------------------------------------------------------
  Este arquivo existia como um "starter" simples (chamava UI.start()).
  Agora o boot.js é o responsável por inicializar a aplicação (e exibir erros
  amigáveis quando algo falta).

  Para manter compatibilidade e evitar "double boot", o main.js só executa
  um fallback quando o boot.js não rodou.
*/

(function () {
  window.addEventListener('DOMContentLoaded', () => {
    const NS = window.VFM26;
    if (!NS) return;

    // Se o boot.js já iniciou, não faz nada.
    if (NS.__booted) return;

    // Fallback: inicializa UI pelo método disponível.
    try {
      if (NS.UI && typeof NS.UI.start === 'function') {
        NS.UI.start();
        return;
      }

      if (NS.UI && typeof NS.UI.init === 'function' && typeof NS.UI.go === 'function') {
        const mount = document.getElementById('app');
        NS.UI.init(mount);
        NS.UI.go('home');
      }
    } catch (e) {
      console.error('main.js fallback failed', e);
    }
  });
})();
