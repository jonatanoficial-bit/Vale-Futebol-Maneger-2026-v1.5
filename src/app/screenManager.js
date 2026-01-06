export function registerScreens(shell, store, repos, logger) {
  const registry = new Map();
  let current = null;

  function add(name, factory) {
    if (registry.has(name)) throw new Error(`Screen duplicada: ${name}`);
    registry.set(name, factory);
  }

  async function show(name, params = {}) {
    try {
      const factory = registry.get(name);
      if (!factory) throw new Error(`Screen não registrada: ${name}`);

      if (current?.dispose) current.dispose();
      shell.clearMain();

      const ctx = { shell, store, repos, logger, params, navigate: (hash) => (window.location.hash = hash) };
      current = await factory(ctx);

      if (current?.render) current.render();
    } catch (err) {
      logger.error("SCREEN_ERROR", err);
      shell.showFatal(err);
    }
  }

  return { add, show };
}