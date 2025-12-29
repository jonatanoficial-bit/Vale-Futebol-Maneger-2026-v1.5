// engine/datapack.js
(() => {
  "use strict";

  /**
   * DataPack (singular)
   * Camada estável para o BOOT e para o fluxo do jogo.
   * Internamente usa window.DataPacks (plural) que já existe no projeto.
   */

  const LS_SELECTED_KEY = "VFM26_SELECTED_PACK_V1";

  function nowISO() {
    try { return new Date().toISOString(); } catch { return ""; }
  }

  function safeStr(x) {
    return String(x ?? "");
  }

  function isObj(x) {
    return x && typeof x === "object" && !Array.isArray(x);
  }

  function logDebug(msg, extra) {
    // mantém silencioso por padrão; se você quiser verboso, troque para console.log
    if (window.DEBUG_BOOT) {
      console.log("[DataPack]", msg, extra ?? "");
    }
  }

  function readSelected() {
    try {
      const raw = localStorage.getItem(LS_SELECTED_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!isObj(parsed) || !parsed.id) return null;
      return {
        id: safeStr(parsed.id),
        name: safeStr(parsed.name),
        version: safeStr(parsed.version),
        selectedAt: safeStr(parsed.selectedAt)
      };
    } catch {
      return null;
    }
  }

  function writeSelected(meta) {
    try {
      const payload = {
        id: safeStr(meta?.id),
        name: safeStr(meta?.name),
        version: safeStr(meta?.version),
        selectedAt: nowISO()
      };
      localStorage.setItem(LS_SELECTED_KEY, JSON.stringify(payload));
      return payload;
    } catch {
      return null;
    }
  }

  function clearSelected() {
    try { localStorage.removeItem(LS_SELECTED_KEY); } catch {}
  }

  function validatePackData(data) {
    // Validação mínima para evitar “pack inválido” quebrar telas
    // (mantendo tolerância para evoluções futuras)
    const errors = [];

    if (!isObj(data)) errors.push("pack.data não é objeto");

    const teams = data?.teams;
    if (teams !== undefined && !Array.isArray(teams)) errors.push("teams não é array");

    const playersByTeamId = data?.playersByTeamId;
    if (playersByTeamId !== undefined && !isObj(playersByTeamId)) errors.push("playersByTeamId não é objeto");

    return {
      ok: errors.length === 0,
      errors
    };
  }

  const DataPack = {
    /**
     * Retorna pack selecionado (meta) ou null.
     */
    getSelected() {
      return readSelected();
    },

    /**
     * Define pack selecionado (somente meta).
     */
    setSelected(packMeta) {
      if (!packMeta || !packMeta.id) throw new Error("DataPack.setSelected: packMeta inválido");
      return writeSelected(packMeta);
    },

    /**
     * Remove seleção (volta ao estado “sem pack”).
     */
    clearSelected() {
      clearSelected();
    },

    /**
     * Lista manifest (delegando pro DataPacks já existente).
     */
    async loadManifest() {
      if (!window.DataPacks || typeof window.DataPacks.loadManifest !== "function") {
        throw new Error("DataPack: window.DataPacks.loadManifest não existe (verifique engine/datapacks.js no index.html)");
      }
      return await window.DataPacks.loadManifest();
    },

    /**
     * Carrega um pack por id (delegando pro DataPacks) e valida mínimo.
     */
    async loadById(packId) {
      if (!window.DataPacks || typeof window.DataPacks.loadPack !== "function") {
        throw new Error("DataPack: window.DataPacks.loadPack não existe (verifique engine/datapacks.js no index.html)");
      }

      const { meta, data } = await window.DataPacks.loadPack(packId);
      const v = validatePackData(data);

      if (!v.ok) {
        const msg = "Pack inválido: " + v.errors.join(" | ");
        throw new Error(msg);
      }

      return { meta, data };
    },

    /**
     * Carrega o pack atualmente selecionado.
     */
    async loadSelected() {
      const sel = readSelected();
      if (!sel?.id) throw new Error("Nenhum pack selecionado");
      return await this.loadById(sel.id);
    },

    /**
     * Inicialização segura (pode ser chamada no boot).
     * - garante que existe DataPacks
     * - tenta validar seleção atual, mas não quebra o app se não houver seleção
     */
    async init() {
      logDebug("init:start");

      // garante alias para compatibilidade
      if (!window.DataPacks && window.DataPack && window.DataPack.loadManifest) {
        // nada a fazer
      }

      if (!window.DataPacks) {
        throw new Error("DataPack.init: window.DataPacks não existe (script engine/datapacks.js não carregou)");
      }

      // Se existe seleção, testa se o pack ainda carrega
      const sel = readSelected();
      if (sel?.id) {
        try {
          await this.loadById(sel.id);
          logDebug("init:selected ok", sel.id);
        } catch (e) {
          // seleção corrompida/pack removido → limpa seleção para não travar o fluxo
          logDebug("init:selected invalid -> clearing", e?.message || e);
          clearSelected();
        }
      }

      logDebug("init:done");
      return true;
    }
  };

  // Export global estável para o BOOT:
  window.DataPack = DataPack;

  // (Opcional, seguro) se alguém no projeto usar DataPacks, mantém:
  // window.DataPacks já existe no engine/datapacks.js, não sobrescrevemos.

})();