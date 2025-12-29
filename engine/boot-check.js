(function () {
  const NS = (window.VFM26 = window.VFM26 || {});

  function assertDOMReady() {
    if (!document || !document.body) {
      throw new Error('DOM não está pronto.');
    }
  }

  NS.BootCheck = { assertDOMReady };
})();