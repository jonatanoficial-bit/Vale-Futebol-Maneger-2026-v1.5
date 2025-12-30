// boot.js
(function () {
  console.log('BOOT: start');

  if (!window.UI || !UI.init) {
    document.body.innerHTML = '<h1>Erro crítico: UI não carregou</h1>';
    return;
  }

  UI.init();

  // ✅ SEMPRE começar pela CAPA
  UI.go('cover');

  console.log('BOOT: ok');
})();