export function start(Engine) {
  if (!Engine || !Engine.isReady) {
    throw new Error("Engine não está pronta");
  }

  const app = document.getElementById("app");

  app.innerHTML = `
    <div style="text-align:center;">
      <h2>VFM26</h2>
      <p>Engine carregada com sucesso.</p>
      <p>Pronto para DataPack, Saves e UI.</p>
    </div>
  `;
}
