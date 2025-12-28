(() => {
  "use strict";

  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch { return fallback; }
  }

  function get(key, fallback) {
    try {
      const v = localStorage.getItem(key);
      if (v === null || v === undefined) return fallback;
      return safeParse(v, fallback);
    } catch {
      return fallback;
    }
  }

  function set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function del(key) {
    try { localStorage.removeItem(key); } catch {}
  }

  window.StorageVFM = { get, set, del };
})();