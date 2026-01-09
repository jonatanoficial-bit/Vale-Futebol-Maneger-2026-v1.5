// src/ui/screens/dataPackSelect.js
import { navigate } from "../../app/router.js";
import { getState } from "../../app/state.js";

export function screenDataPackSelect() {
  const el = document.createElement("div");
  el.className = "screen card";

  el.innerHTML = `
    <h2>Escolha o Pacote de Dados</h2>
    <p>Atualizações (elenco/competições) virão por DLC</p>
    <div id="packList" class="list"></div>
    <button class="btn" id="back">Voltar</button>
  `;

  const state = getState();
  const packList = el.querySelector("#packList");

  const packs = Array.isArray(state?.packs) ? state.packs : [];

  if (packs.length === 0) {
    packList.innerHTML = `
      <div class="empty">
        Nenhum pacote disponível.<br>
        Verifique o carregamento inicial do jogo.
      </div>
    `;
  } else {
    for (const pack of packs) {
      const item = document.createElement("div");
      item.className = "list-item";
      item.innerHTML = `
        <strong>${pack.name || "Pacote sem nome"}</strong><br>
        <small>${pack.id || ""}</small>
        <button class="btn btn-primary">Selecionar</button>
      `;
      item.querySelector("button").onclick = () => {
        state.activePack = pack.id;
        navigate("#/saveSlots");
      };
      packList.appendChild(item);
    }
  }

  el.querySelector("#back").onclick = () => history.back();

  return el;
}
