// src/app/state.js
// Compatibilidade: algumas versões antigas importavam "state.js".
// Hoje o store/estado está em "stateStore.js".

export { createStore } from "./stateStore.js";
export { STORAGE_KEYS } from "./stateStore.js";