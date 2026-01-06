export function createStore() {
  let state = {};
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(next) {
    state = next;
    for (const fn of listeners) fn(state);
  }

  function update(fn) {
    const next = fn(state);
    setState(next);
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return { getState, setState, update, subscribe };
}