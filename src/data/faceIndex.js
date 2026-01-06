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
    const idx = await fetchJSON("./assets/face/index.json");
    const faces = Array.isArray(idx?.faces) ? idx.faces : [];
    const ids = faces.map(normalizeIdFromFilename).filter(Boolean);
    return new Set(ids);
  } catch (err) {
    logger?.warn?.("FACE_INDEX_MISSING", "assets/face/index.json não encontrado (ok, usando fallback).");
    return new Set();
  }
}