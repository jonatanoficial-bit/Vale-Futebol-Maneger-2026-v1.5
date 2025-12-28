(function () {
  function getSlotKey(slot) {
    return slot === 1 ? "slot1" : "slot2";
  }

  function readCareer(slot) {
    const s = window.State.loadState();
    const k = getSlotKey(slot);
    return s.careers[k] || null;
  }

  function writeCareer(slot, career) {
    const s = window.State.loadState();
    const k = getSlotKey(slot);
    const next = {
      ...s,
      careers: {
        ...s.careers,
        [k]: career,
      },
    };
    window.State.saveState(next);
    return next;
  }

  function clearCareer(slot) {
    return writeCareer(slot, null);
  }

  window.SaveSlots = {
    readCareer,
    writeCareer,
    clearCareer,
  };
})();