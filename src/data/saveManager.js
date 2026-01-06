const KEY = "vfm_saves_v1";

function blankSlot() {
  return { exists: false, updatedAt: null, data: null };
}

function blankSaves() {
  return {
    version: 1,
    slots: {
      "1": blankSlot(),
      "2": blankSlot()
    }
  };
}

export function createSaveManager(logger) {
  function readAll() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return blankSaves();
      const parsed = JSON.parse(raw);
      if (!parsed?.slots?.["1"] || !parsed?.slots?.["2"]) return blankSaves();
      return parsed;
    } catch (err) {
      logger?.error?.("SAVE_READ_ERROR", err);
      return blankSaves();
    }
  }

  function writeAll(obj) {
    localStorage.setItem(KEY, JSON.stringify(obj));
  }

  function readSlot(slotId) {
    const all = readAll();
    return all.slots[String(slotId)] || blankSlot();
  }

  function writeSlot(slotId, data) {
    const all = readAll();
    all.slots[String(slotId)] = {
      exists: true,
      updatedAt: new Date().toISOString(),
      data
    };
    writeAll(all);
  }

  function clearSlot(slotId) {
    const all = readAll();
    all.slots[String(slotId)] = blankSlot();
    writeAll(all);
  }

  return { readAll, readSlot, writeSlot, clearSlot };
}