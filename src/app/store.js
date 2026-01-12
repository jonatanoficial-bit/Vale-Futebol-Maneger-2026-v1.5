// src/app/store.js
// Compatibilidade: algumas versões antigas importavam "store.js".
// Hoje o store está centralizado em "stateStore.js".

export { createStore } from "./stateStore.js";
export { STORAGE_KEYS } from "./stateStore.js";