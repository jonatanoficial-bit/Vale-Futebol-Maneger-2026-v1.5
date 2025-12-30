(function () {
  window.VFM26 = window.VFM26 || {};
  const NS = window.VFM26;

  const LobbyUI = {
    id: 'lobby',

    render(container) {
      const game = NS.Game;
      const career = game.getCareer();
      if (!career) {
        container.innerHTML = `
          <div class="screen">
            <h1>Lobby</h1>
            <p>Sem carreira ativa.</p>
            <button class="btn" id="back">Voltar</button>
          </div>
        `;
        container.querySelector('#back').onclick = () => NS.UI.go('cover');
        return;
      }

      const clubs = game.getClubsFromPack();
      const club = clubs.find(c => c.id === career.clubId) || { name: career.clubId, crest: null };

      container.innerHTML = `
        <div class="screen">
          <div class="panel">
            <h1>Lobby</h1>
            <div class="muted">Você assumiu: <b>${club.name}</b></div>
          </div>

          <div class="card">
            <div class="row">
              ${club.crest ? `<img class="crest" src="${club.crest}" alt="escudo" />` : ``}
              <div>
                <div class="title">Bem-vindo, ${career.managerName}!</div>
                <div class="muted">Cargo: ${career.role} | Clube: ${club.name}</div>
              </div>
            </div>
            <div class="muted" style="margin-top:10px">
              Use o Lobby para gestão completa (elenco, treinos, notícias e calendário).
            </div>
          </div>

          <div class="row gap">
            <button class="btn" id="backBtn">VOLTAR</button>
            <button class="btn primary" id="calBtn">CALENDÁRIO (Fase 4)</button>
          </div>

          <div class="panel">
            <div class="muted">
              Em fases seguintes: elenco completo, treinos semanais, táticas, mercado e engine mais profunda.
            </div>
          </div>
        </div>
      `;

      container.querySelector('#backBtn').onclick = () => NS.UI.go('cover');
      container.querySelector('#calBtn').onclick = () => NS.UI.go('calendar');
    }
  };

  NS.UI.register(LobbyUI.id, LobbyUI);
})();