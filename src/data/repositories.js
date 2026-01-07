// /src/data/repositories.js

import { loadJson } from "./utils/loadJson.js";

export async function createRepositories({ logger }) {
  const dataPacks = await loadDataPacks(logger);

  return {
    dataPacks,
  };
}

async function loadDataPacks(logger) {
  try {
    const packs = await loadJson("./packs/index.json");

    if (!Array.isArray(packs)) {
      logger?.warn?.("packs/index.json não é array, aplicando fallback.");
      return fallbackPacks();
    }

    return packs;
  } catch (err) {
    logger?.error?.("Falha ao carregar packs, usando fallback.", err);
    return fallbackPacks();
  }
}

function fallbackPacks() {
  return [
    {
      id: "base-2025-26",
      name: "Base 2025/2026 (Brasil MVP)",
      recommended: true,
      description: "Pacote base com clubes e competições do Brasil.",
    },
  ];
}