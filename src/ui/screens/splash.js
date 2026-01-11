// src/ui/screens/splash.js

export function screenSplash({ root }) {
  root.innerHTML = `
    <div class="screen screen-splash">
      <div class="card">
        <h1>Modo Carreira</h1>
        <p>
          Construa sua história como Treinador.
          Atualizações via Pacotes de Dados (DLC) sem mexer no código.
        </p>

        <button id="btnStart" class="btn primary">Iniciar</button>
        <button id="btnAdmin" class="btn">Admin</button>
      </div>

      <div class="error-box hidden" id="errorBox">
        <p>Ocorreu um erro</p>
        <button id="btnReload" class="btn danger">Recarregar</button>
      </div>
    </div>
  `;

  // 🔗 NAVEGAÇÃO CORRETA VIA HASH (router)
  const btnStart = root.querySelector("#btnStart");
  const btnAdmin = root.querySelector("#btnAdmin");
  const btnReload = root.querySelector("#btnReload");

  btnStart.onclick = () => {
    location.hash = "#/saveSlots";
  };

  btnAdmin.onclick = () => {
    location.hash = "#/admin";
  };

  btnReload.onclick = () => {
    location.reload();
  };
}