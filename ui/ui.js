// ui/ui.js
window.UI = {
  routes: {},
  current: null,

  init() {
    console.log('UI.init');
    this.registerCoreRoutes();
  },

  register(name, renderFn) {
    this.routes[name] = renderFn;
  },

  go(name, data = {}) {
    if (!this.routes[name]) {
      throw new Error(`Rota inválida: ${name}`);
    }

    const app = document.getElementById('app');
    app.innerHTML = '';
    this.current = name;
    this.routes[name](app, data);
  },

  registerCoreRoutes() {
    // ✅ COVER (CAPA)
    this.register('cover', (app) => {
      app.innerHTML = `
        <div class="screen cover">
          <h1>VALE FUTEBOL MANAGER 2026</h1>
          <p>Simulador de futebol manager</p>
          <button id="btnStart">INICIAR</button>
        </div>
      `;

      document.getElementById('btnStart').onclick = () => {
        UI.go('datapack');
      };
    });

    // ✅ DATAPACK
    this.register('datapack', (app) => {
      app.innerHTML = `
        <div class="screen">
          <h2>ESCOLHER DATAPACK</h2>
          <button id="useBrasil">Brasil</button>
        </div>
      `;

      document.getElementById('useBrasil').onclick = () => {
        UI.go('career');
      };
    });

    // ✅ CRIAR CARREIRA
    this.register('career', (app) => {
      app.innerHTML = `
        <div class="screen">
          <h2>Criar Carreira</h2>
          <button id="goLobby">Entrar no Lobby</button>
        </div>
      `;

      document.getElementById('goLobby').onclick = () => {
        UI.go('lobby');
      };
    });

    // ✅ LOBBY
    this.register('lobby', (app) => {
      app.innerHTML = `
        <div class="screen">
          <h2>Lobby</h2>
          <p>Bem-vindo ao clube!</p>
        </div>
      `;
    });
  }
};