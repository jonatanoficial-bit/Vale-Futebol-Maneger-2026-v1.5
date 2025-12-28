(function () {
  const STORAGE_KEY = "VFM26_STATE_V1";

  const defaultState = () => ({
    app: {
      version: "v1",
      build: "baseline",
    },
    selection: {
      pack: null, // { id, name }
      slot: null, // 1 | 2
    },
    careers: {
      slot1: null,
      slot2: null,
    },
  });

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = window.Utils.safeJsonParse(raw, null);
    if (!parsed || typeof parsed !== "object") return defaultState();
    return { ...defaultState(), ...parsed };
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setState(patch) {
    const s = loadState();
    const next = { ...s, ...patch };
    saveState(next);
    return next;
  }

  window.State = {
    STORAGE_KEY,
    defaultState,
    loadState,
    saveState,
    setState,
  };
})();