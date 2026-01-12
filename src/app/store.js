// Compatibility layer
// -------------------
// Some older modules imported "./store.js" instead of "./state.js".
// Export the same singleton store so those imports keep working.

export * from "./state.js";