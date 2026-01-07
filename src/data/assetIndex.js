// /src/data/assetIndex.js
function toAbs(relFromProjectRoot) {
  return new URL(`../../${relFromProjectRoot}`.replace(/^\.\//, ""), import.meta.url).toString();
}

async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao carregar JSON: ${url} (${res.status})`);
  return res.json();
}

function normalizeIdFromFilename(filename) {
  return String(filename).replace(/\.[^.]+$/, "").trim();
}

export async function loadLogoIndex(logger) {
  try {
    const idxUrl = toAbs("assets/logos/index.json");
    const idx = await fetchJSON(idxUrl);
    const logos = Array.isArray(idx?.logos) ? idx.logos : [];
    const ids = logos.map(normalizeIdFromFilename).filter(Boolean);
    return Array.from(new Set(ids));
  } catch (err) {
    logger?.warn?.("LOGO_INDEX_MISSING", "assets/logos/index.json não encontrado — ok (fallback).");
    return [];
  }
}