// /engine/index.js
// Registro da Engine (carrega antes da UI)

export const Engine = {
  version: "1.0.0",
  isReady: true,

  state: {
    datapack: null,
    saveSlot: null,
    career: null
  },

  log(message, data) {
    if (data !== undefined) console.log("[ENGINE]", message, data);
    else console.log("[ENGINE]", message);
  }
};
