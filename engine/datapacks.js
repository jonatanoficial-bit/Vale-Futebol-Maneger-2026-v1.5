// engine/datapacks.js
// DataPack catalog + loader
// - Fonte principal: packs/catalog.json (permite adicionar packs sem mexer no código)
// - Fallback: catálogo interno (para nunca quebrar o boot)
//
// Namespace: window.VFM26.DataPacks

(function () {
  const NS = (window.VFM26 = window.VFM26 || {});

  const FALLBACK_CATALOG = {
    version: 1,
    packs: [
      {
        id: "brasil",
        name: "Brasil (Série A, Série B, Copa do Brasil, Estaduais)",
        file: "packs/brasil_pack.json",
        region: "SA",
        default: true
      }
    ]
  };

  function toAbsUrl(url) {
    // Resolve corretamente em GitHub Pages (subpasta) e Vercel (root).
    return new URL(String(url), document.baseURI).toString();
  }

  async function fetchJson(url) {
    const abs = toAbsUrl(url);
    const bust = abs + (abs.includes("?") ? "&" : "?") + "_=" + Date.now();
    const res = await fetch(bust, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return await res.json();
  }

  function normalizeCatalog(cat) {
    const packs = Array.isArray(cat?.packs) ? cat.packs : [];
    return {
      version: typeof cat?.version === "number" ? cat.version : 1,
      packs: packs
        .filter(p => p && p.id && p.name && p.file)
        .map(p => ({
          id: String(p.id),
          name: String(p.name),
          file: String(p.file),
          region: p.region ? String(p.region) : "",
          default: Boolean(p.default)
        }))
    };
  }

  async function listCatalog() {
    try {
      const remote = await fetchJson("packs/catalog.json");
      const normalized = normalizeCatalog(remote);
      if (normalized.packs.length > 0) return normalized;
      return normalizeCatalog(FALLBACK_CATALOG);
    } catch (e) {
      return normalizeCatalog(FALLBACK_CATALOG);
    }
  }

  async function loadPack(packFile) {
    return await fetchJson(packFile);
  }

  NS.DataPacks = {
    toAbsUrl,
    listCatalog,
    loadPack
  };
})();