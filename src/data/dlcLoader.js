import { validateManifest, validatePackData } from "./dlcValidator.js";

async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao carregar JSON: ${url} (${res.status})`);
  return res.json();
}

export async function listAvailablePacks() {
  const index = await fetchJSON("./data-packs/index.json");
  if (!index?.packs?.length) return [];
  return index.packs;
}

export async function loadPackByPath(packPath, logger) {
  const manifest = await fetchJSON(`${packPath}/manifest.json`);
  validateManifest(manifest);

  const content = {};
  const entries = Object.entries(manifest.content || {});
  for (const [key, file] of entries) {
    content[key] = await fetchJSON(`${packPath}/${file}`);
  }

  validatePackData({ manifest, content });

  logger?.info?.("PACK_LOADED", { id: manifest.id, version: manifest.version });
  return { manifest, content };
}