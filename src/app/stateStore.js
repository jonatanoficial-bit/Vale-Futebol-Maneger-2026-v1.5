// Compatibility layer
// -------------------
// Alguns deploys antigos (ou caches do navegador) ainda tentam importar:
//   - ./src/app/state.js
//   - ./src/app/store.js
//
// Na v1.5 o estado passou a usar o stateStore.js (createStore). Para evitar
// erros 404/import e deixar a UI funcionando mesmo com algum arquivo antigo
// ainda referenciando esses módulos, mantemos um singleton de store aqui.
//
// Importante: o bootstrap.js também seta `globalThis.__VFM_STORE__` para que
// todos usem o MESMO store.

import { createStore } from "./stateStore.js";

function getFallbackInitialState() {
  return {
    meta: { appVersion: "v1.5.0", buildLabel: "web" },
    dlc: { selectedPackId: null, packs: [], lastFetchAt: null },
    career: {
      slotIndex: null,
      role: "coach",
      coach: { name: "", nation: "Brasil", avatarId: "avatar01" },
      clubId: null,
      tutorialDone: false,
    },
    competitions: {
      seasonActive: false,
      seasonId: null,
      generatedAt: null,
      tables: {},
      calendar: [],
      results: [],
    },
    finance: { budget: 0, wageBudget: 0 },
    squad: { byClub: {} },
  };
}

const existing = globalThis.__VFM_STORE__;
export const store = existing || createStore(getFallbackInitialState());

// Se foi criado aqui (porque alguém importou antes do bootstrap), expõe também.
if (!existing) {
  globalThis.__VFM_STORE__ = store;
}

// Helpers (úteis para módulos antigos)
export const getState = () => store.getState();
export const setState = (next) => store.setState(next);
export const patchState = (patch) => store.patchState(patch);
export const subscribe = (fn) => store.subscribe(fn);