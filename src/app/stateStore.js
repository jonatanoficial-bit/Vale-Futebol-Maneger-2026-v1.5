// src/app/stateStore.js

let state = {};
const listeners = [];

function notify() {
  for (const l of listeners) l(state);
}

export function createStore(initial = {}) {
  state = structuredClone(initial);

  return {
    getState() {
      return state;
    },

    setState(newState) {
      state = structuredClone(newState);
      notify();
    },

    update(mutator) {
      const copy = structuredClone(state);
      const result = mutator(copy);
      state = result || copy;
      notify();
    },

    subscribe(fn) {
      listeners.push(fn);
      return () => {
        const idx = listeners.indexOf(fn);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },
  };
}