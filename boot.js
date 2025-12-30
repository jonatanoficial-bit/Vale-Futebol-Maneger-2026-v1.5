(function () {
  window.NS = window.NS || {};
  NS.BOOT_STEPS = [];

  function step(msg) {
    NS.BOOT_STEPS.push(msg);
    console.log("[BOOT]", msg);
  }

  function fatal(msg, code) {
    alert(
      "Erro crítico\n\n" +
      msg +
      "\n\nCódigo: " + code +
      "\n\nDebug no console (BOOT_STEPS)."
    );
    throw new Error(code);
  }

  NS.bootStep = step;

  NS.bootAssert = function (cond, msg, code) {
    if (!cond) fatal(msg, code);
  };

  document.addEventListener("DOMContentLoaded", () => {
    step("DOM pronto");
  });

  step("Boot inicializado");
})();