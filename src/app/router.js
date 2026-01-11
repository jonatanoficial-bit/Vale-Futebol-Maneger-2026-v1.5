export function createRouter({ onRoute }) {
  function parseHash() {
    const raw = window.location.hash || "#/";
    const cleaned = raw.startsWith("#") ? raw.slice(1) : raw; // remove '#'
    const [pathPart, queryPart] = cleaned.split("?");
    const path = pathPart || "/";
    const segments = path.split("/").filter(Boolean);

    const params = {};
    if (queryPart) {
      const usp = new URLSearchParams(queryPart);
      for (const [k, v] of usp.entries()) params[k] = v;
    }

    return { raw, path, segments, params };
  }

  function handle() {
    onRoute(parseHash());
  }

  window.addEventListener("hashchange", handle);

  return {
    start() {
      handle();
    },
    getRoute() {
      return parseHash();
    },
    stop() {
      window.removeEventListener("hashchange", handle);
    },
  };
}