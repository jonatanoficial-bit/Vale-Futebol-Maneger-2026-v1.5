export async function screenTutorial({ shell, repos, store, navigate }) {
  const state = store.getState();
  if (!state.career?.clubId) { navigate("#/clubSelect"); return { render() {} }; }

  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <div class="card__header">
      <div>
        <div class="card__title">Bem-vindo, Treinador</div>
        <div class="card__subtitle">Um funcionário do clube vai te orientar</div>
      </div>
      <span class="badge">Tutorial</span>
    </div>
    <div class="card__body">
      <div class="h1">Boas-vindas!</div>
      <div class="p">
        Aqui você gerencia <b>elenco</b>, <b>treinos</b>, <b>tática</b>, <b>agenda</b>, <b>notícias</b> e <b>resultados</b>.
        O jogo é alimentado por <b>Pacotes de Dados</b>, então atualizar elenco vira só adicionar JSON no GitHub.
      </div>

      <div style="height:12px"></div>

      <div class="card" style="border-radius:18px">
        <div class="card__body">
          <div class="row">
            <div>
              <div style="font-weight:900">Próximo passo</div>
              <div class="muted" style="font-size:12px">Entrar no Hub do treinador</div>
            </div>
            <span class="badge">OK</span>
          </div>
        </div>
      </div>

      <div style="height:12px"></div>
      <button class="btn btn--primary" id="go">Ir para o Hub</button>
      <div style="height:10px"></div>
      <button class="btn" id="back">Voltar</button>
    </div>
  `;

  el.querySelector("#back").addEventListener("click", () => navigate("#/clubSelect"));
  el.querySelector("#go").addEventListener("click", () => {
    // cria um save inicial assim que entrar no hub (primeira persistência do projeto)
    const snapshot = store.getState();
    repos.saves.writeSlot(snapshot.career.slot, snapshot);
    navigate("#/hub");
  });

  shell.mount(el);
  return { render() {} };
}