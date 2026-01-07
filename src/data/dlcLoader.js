// /src/data/dlcLoader.js
import { validateManifest, validatePackData } from "./dlcValidator.js";

function toAbs(relFromProjectRoot) {
  // dlcLoader está em /src/data → volta 2 níveis até a raiz do projeto
  return new URL(`../../${relFromProjectRoot}`.replace(/^\.\//, ""), import.meta.url).toString();
}

async function fetchJSON(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Falha ao carregar JSON: ${url} (${res.status})`);
  return res.json();
}

export async function listAvailablePacks() {
  const indexUrl = toAbs("data-packs/index.json");
  const index = await fetchJSON(indexUrl);
  if (!index?.packs?.length) return [];
  return index.packs;
}

export async function loadPackByPath(packPath, logger) {
  // packPath no index.json vem como "./data-packs/base-2025-26"
  // Vamos converter para absoluto de forma segura
  const packBase = packPath.startsWith("http")
    ? packPath
    : toAbs(packPath.replace(/^\.\//, ""));

  const manifest = await fetchJSON(`${packBase}/manifest.json`);
  validateManifest(manifest);

  const content = {};
  const entries = Object.entries(manifest.content || {});
  for (const [key, file] of entries) {
    content[key] = await fetchJSON(`${packBase}/${file}`);
  }

  validatePackData({ manifest, content });

  logger?.info?.("PACK_LOADED", { id: manifest.id, version: manifest.version });
  return { manifest, content };
}