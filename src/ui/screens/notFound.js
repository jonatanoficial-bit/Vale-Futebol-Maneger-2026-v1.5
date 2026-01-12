// src/ui/screens/notFound.js
export async function screenNotFound({ shell, navigate }) {
  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <div class="card__header">
      <div>
        <div class="card__title">Página não encontrada</div>
        <div class="card__subtitle">A rota acessada não existe.</div>
      </div>
      <span class="badge">404</span>
    </div>
    <div class="card__body">
      <div class="muted" style="margin-bottom:12px">
        Volte para o menu inicial.
      </div>
      <button class="btn btn--primary" id="goHome">Ir para o Menu</button>
    </div>
  `;

  el.querySelector("#goHome").addEventListener("click", () => navigate("#/"));
  shell.mount(el);

  return { render() {} };
}