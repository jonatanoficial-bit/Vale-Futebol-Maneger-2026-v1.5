/* engine/datapacks.js — Carregamento de dados (DataPacks) */
(function () {
  'use strict';

  const NS = (window.VFM26 = window.VFM26 || {});
  const BootCheck = NS.BootCheck;

  const CATALOG = [
    {
      id: 'brasil',
      name: 'Brasil (Série A, Série B, Copa do Brasil, Estaduais)',
      region: 'SA',
      description: 'Pack inicial. Estrutura pronta para expansão mundial via novos JSON em /packs.',
      file: 'packs/brasil_pack.json'
    }
  ];

  async function fetchJSON(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`Falha ao carregar JSON (${res.status}) em ${url}`);
    }
    return await res.json();
  }

  const DataPacks = {
    async listCatalog() {
      return CATALOG.slice();
    },

    async load(packId) {
      BootCheck && BootCheck.step('DATAPACK_LOAD_BEGIN');

      const meta = CATALOG.find(p => p.id === packId);
      if (!meta) throw new Error(`DataPack não encontrado: ${packId}`);

      const data = await fetchJSON(meta.file);

      // validação mínima
      if (!data || typeof data !== 'object') throw new Error('Pack inválido (JSON vazio).');
      if (!Array.isArray(data.clubs)) throw new Error('Pack inválido: campo "clubs" precisa ser array.');

      BootCheck && BootCheck.step('DATAPACK_LOAD_OK');
      return { meta, data };
    }
  };

  NS.Engine = NS.Engine || {};
  NS.Engine.DataPacks = DataPacks;
})();