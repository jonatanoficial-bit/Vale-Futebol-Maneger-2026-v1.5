async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao carregar JSON: ${url} (${res.status})`);
  return res.json();
}

function normalizeIdFromFilename(filename) {
  return String(filename).replace(/\.[^.]+$/, "").trim();
}

export async function loadLogoIndex() {
  const idx = await fetchJSON("./assets/logos/index.json");
  const logos = Array.isArray(idx?.logos) ? idx.logos : [];
  const ids = logos.map(normalizeIdFromFilename).filter(Boolean);
  return Array.from(new Set(ids));
}