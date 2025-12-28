(function () {
  // Packs: estrutura para DLC/atualizações sem mexer no código do jogo.
  // Por enquanto: lista simples; depois pode ler de /packs/<id>/manifest.json.
  const PACKS = [
    { id: "pack_default_2026", name: "Pacote 2026 (Padrão)" }
  ];

  function listPacks() {
    return [...PACKS];
  }

  async function loadPack(packId) {
    // Baseline: só registra o pack selecionado.
    // Evolução segura: buscar manifest em /packs/<packId>/manifest.json
    const p = PACKS.find((x) => x.id === packId);
    if (!p) throw new Error("Pacote não encontrado.");
    return { ...p, loadedAt: Date.now() };
  }

  window.DataPack = {
    listPacks,
    loadPack,
  };
})();