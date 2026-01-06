export async function screenSplash({ shell, navigate, store }) {
  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <div class="card__body">
      <div class="h1">Modo Carreira</div>
      <div class="p">Construa sua história como <b>Treinador</b>. Atualizações de elenco e competições via <b>Pacotes de Dados</b> (DLC) sem mexer no código.</div>
      <div style="height:12px"></div>
      <button class="btn btn--primary" id="start">Iniciar</button>
      <div style="height:10px"></div>
      <button class="btn" id="admin">Admin (em breve)</button>
    </div>
  `;

  el.querySelector("#start").addEventListener("click", () => navigate("#/dataPackSelect"));
  el.querySelector("#admin").addEventListener("click", () => {
    alert("Admin entra no Milestone 12. Mantive o botão para o fluxo futuro.");
  });

  shell.mount(el);
  return { render() {} };
}