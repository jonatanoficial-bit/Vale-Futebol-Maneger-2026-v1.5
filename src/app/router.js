export function createRouter({ onRoute, logger }) {
  if (typeof onRoute !== "function") throw new Error("Router requer onRoute(route).");

  function parseHash(hash) {
    const raw = (hash || "").trim();
    const clean = raw.startsWith("#") ? raw.slice(1) : raw;

    // formato: /screen?x=1
    const [pathPart, queryPart] = clean.split("?");
    const path = (pathPart || "/").replace(/\/+/g, "/");

    const seg = path.split("/").filter(Boolean);
    const name = seg[0] || "splash";

    const params = {};
    if (queryPart) {
      const sp = new URLSearchParams(queryPart);
      for (const [k, v] of sp.entries()) params[k] = v;
    }

    return { name, params };
  }

  function go(hash) {
    window.location.hash = hash;
  }

  function handle() {
    try {
      const route = parseHash(window.location.hash);
      onRoute(route);
    } catch (err) {
      logger.error("ROUTER_ERROR", err);
    }
  }

  function start({ defaultRoute }) {
    window.addEventListener("hashchange", handle);
    if (!window.location.hash && defaultRoute) window.location.hash = defaultRoute;
    handle();
  }

  return { start, go };
}