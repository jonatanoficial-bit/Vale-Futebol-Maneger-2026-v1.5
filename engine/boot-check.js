export function runBootCheck() {
  return new Promise((resolve, reject) => {
    try {
      const required = [
        "index.html",
        "main.js",
        "game.js",
        "engine/index.js"
      ];

      if (!document.getElementById("app")) {
        throw new Error("Elemento #app não encontrado");
      }

      resolve(true);
    } catch (err) {
      reject(err);
    }
  });
}
