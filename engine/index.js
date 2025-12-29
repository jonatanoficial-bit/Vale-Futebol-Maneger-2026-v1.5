export const Engine = {
  version: "1.0.0",
  isReady: true,

  state: {
    datapack: null,
    saveSlot: null,
    career: null
  },

  log(message) {
    console.log("[ENGINE]", message);
  }
};
