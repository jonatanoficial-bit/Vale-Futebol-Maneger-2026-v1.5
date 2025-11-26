/* =======================================================
   VALE FUTEBOL MANAGER 2026
   main.js – Inicialização do jogo e troca de telas
   =======================================================*/

window.addEventListener("load", () => {
    console.log("%c Vale Futebol Manager 2026 iniciado!", "color:#C7A029; font-size:20px; font-weight:bold");
    UI.init();
});

/* =======================================================
   Troca de telas (sistema único)
   =======================================================*/
function mostrarTela(id) {
    document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add("ativa");
}

/* =======================================================
   Jogo Global (para a UI)
   =======================================================*/

window.Game = {
    data: {},       // save completo (pode usar para cache)
    coachName: "",
    teamId: "",
    rodada: 1,
    saldo: 50,
    formacao: "4-3-3",
    estilo: "equilibrado",

    elenco: [],     // jogadores carregados
    titulares: {},  // 11 posições
    reservas: [],   // banco
};
