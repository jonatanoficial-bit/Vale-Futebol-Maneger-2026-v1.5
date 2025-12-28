(() => {
  "use strict";

  const MANIFEST_PATH = "./packs/manifest.json";

  async function fetchJson(path) {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(`Falha ao carregar: ${path} (${res.status})`);
    return await res.json();
  }

  async function loadManifest() {
    const manifest = await fetchJson(MANIFEST_PATH);
    if (!manifest || !Array.isArray(manifest.packs)) {
      throw new Error("manifest.json inválido: esperado { packs: [] }");
    }
    return manifest;
  }

  async function loadPack(packId) {
    const manifest = await loadManifest();
    const pack = manifest.packs.find(p => p.id === packId);
    if (!pack) throw new Error(`Pack não encontrado: ${packId}`);

    const packData = await fetchJson(pack.path);
    validatePack(packData);

    return {
      meta: pack,
      data: packData
    };
  }

  function validatePack(pack) {
    if (!pack || typeof pack !== "object") throw new Error("Pack inválido");
    if (typeof pack.schemaVersion !== "number") throw new Error("Pack sem schemaVersion");
    if (!pack.teams || !Array.isArray(pack.teams)) throw new Error("Pack sem teams[]");
    // playersByTeamId é opcional nessa fase, mas se existir deve ser objeto
    if (pack.playersByTeamId && typeof pack.playersByTeamId !== "object") {
      throw new Error("playersByTeamId inválido");
    }
  }

  window.DataPacks = { loadManifest, loadPack };
})();