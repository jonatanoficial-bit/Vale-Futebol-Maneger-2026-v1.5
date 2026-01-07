// /src/data/faceIndex.js
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

export async function tryLoadFaceIndex(logger) {
  try {
    const idxUrl = toAbs("assets/face/index.json");
    const idx = await fetchJSON(idxUrl);
    const faces = Array.isArray(idx?.faces) ? idx.faces : [];
    const ids = faces.map(normalizeIdFromFilename).filter(Boolean);
    return new Set(ids);
  } catch (err) {
    logger?.warn?.("FACE_INDEX_MISSING", "assets/face/index.json não encontrado (ok, usando fallback).");
    return new Set();
  }
}