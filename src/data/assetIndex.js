async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao carregar JSON: ${url} (${res.status})`);
  return res.json();
}

function normalizeIdFromFilename(filename) {
  // "ACG.png" -> "ACG"
  return String(filename).replace(/\.[^.]+$/, "").trim();
}

export async function loadLogoIndex() {
  // arquivo estático obrigatório no GitHub Pages
  const idx = await fetchJSON("./assets/logos/index.json");
  const logos = Array.isArray(idx?.logos) ? idx.logos : [];
  const ids = logos
    .map(normalizeIdFromFilename)
    .filter(Boolean);

  // remove duplicados
  return Array.from(new Set(ids));
}