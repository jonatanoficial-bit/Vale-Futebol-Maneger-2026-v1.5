(() => {
  "use strict";

  const SLOT_KEYS = ["vfm26_slot_1", "vfm26_slot_2"];

  function emptySlot() {
    return {
      exists: false,
      updatedAt: null,
      packId: null,
      packName: null,
      packVersion: null,
      career: null
    };
  }

  function readSlot(slotIndex) {
    const key = SLOT_KEYS[slotIndex];
    const raw = window.StorageVFM.get(key, null);
    if (!raw) return emptySlot();
    return {
      exists: true,
      updatedAt: raw.updatedAt || null,
      packId: raw.packId || null,
      packName: raw.packName || null,
      packVersion: raw.packVersion || null,
      career: raw.career || null
    };
  }

  function writeSlot(slotIndex, payload) {
    const key = SLOT_KEYS[slotIndex];
    const wrapped = {
      updatedAt: new Date().toISOString(),
      ...payload
    };
    window.StorageVFM.set(key, wrapped);
  }

  function clearSlot(slotIndex) {
    const key = SLOT_KEYS[slotIndex];
    window.StorageVFM.del(key);
  }

  function listSlots() {
    return [readSlot(0), readSlot(1)];
  }

  window.SaveSlots = { listSlots, readSlot, writeSlot, clearSlot };
})();