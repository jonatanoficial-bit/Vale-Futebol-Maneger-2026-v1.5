/* =======================================================
   VALE FUTEBOL MANAGER 2026
   main.js — Núcleo de inicialização e controle de telas
   ======================================================= */

console.log(
    "%c[MAIN] Vale Futebol Manager 2026 — iniciado!",
    "color:#C7A029; font-size:20px; font-weight:bold;"
);

/* =======================================================
   ESTADO GLOBAL DO JOGO
   ======================================================= */
window.Game = {
    loaded: false,
    coachName: "",
    teamId: "",
    nextMatchId: null
};

/* =======================================================
   FUNÇÃO GLOBAL DE TROCA DE TELAS
   ======================================================= */
window.mostrarTela = function (id) {
    document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add("ativa");
};

/* =======================================================
   INICIALIZAÇÃO GERAL DO JOGO
   ======================================================= */
window.addEventListener("load", () => {
    console.log("%c[MAIN] Sistema carregado.", "color:cyan;");

    configurarBotoesCapa();
    UI.init();
});

/* =======================================================
   BOTOES DA CAPA
   ======================================================= */
function configurarBotoesCapa() {

    const btnIniciar = document.getElementById("btn-iniciar");
    const btnContinuar = document.getElementById("btn-continuar");

    // INICIAR NOVA CARREIRA
    btnIniciar.addEventListener("click", () => {
        console.log("[MAIN] Iniciando nova carreira...");
        mostrarTela("tela-escolha-time");
        preencherListaTimes();
    });

    // CONTINUAR CARREIRA
    btnContinuar.addEventListener("click", () => {
        console.log("[MAIN] Tentando carregar save...");
        const save = Save.load();

        if (!save || !save.teamId) {
            alert("Nenhuma carreira salva encontrada.");
            return;
        }

        carregarCarreiraSalva(save);
    });
}

/* =======================================================
   CARREGAR TIMES PARA ESCOLHA
   ======================================================= */
function preencherListaTimes() {
    const container = document.getElementById("lista-times");
    container.innerHTML = "";

    const lista = Database.teams;
    if (!lista || !lista.length) {
        container.innerHTML = "<p>Nenhum time encontrado no database.</p>";
        return;
    }

    lista.forEach(team => {
        const card = document.createElement("button");
        card.className = "time-card";

        card.innerHTML = `
            <img src="assets/logos/${team.id}.png" class="time-card-logo">
            <div class="time-card-nome">${team.name}</div>
        `;

        card.addEventListener("click", () => iniciarNovaCarreira(team.id));
        container.appendChild(card);
    });
}

/* =======================================================
   INICIAR NOVA CARREIRA
   ======================================================= */
function iniciarNovaCarreira(teamId) {

    const nome = prompt("Nome do treinador:", "Técnico");
    const coach = nome && nome.trim() !== "" ? nome.trim() : "Técnico";

    console.log("[MAIN] Nova carreira criada para:", coach, "Time:", teamId);

    League.resetSeason();                 // reset total da temporada
    Calendar.buildSeasonCalendar();       // gera calendário anual

    Game.teamId = teamId;
    Game.coachName = coach;

    Save.saveCareer(Game.teamId, Game.coachName);

    atualizarLobby();
    mostrarTela("tela-lobby");
}

/* =======================================================
   CARREGAR CARREIRA SALVA
   ======================================================= */
function carregarCarreiraSalva(save) {

    console.log("%c[MAIN] Carregando save...", "color:#0EA5E9;", save);

    Game.teamId = save.teamId;
    Game.coachName = save.coachName;

    // Recarrega liga e calendário do save
    League.loadFromSave(save);
    Calendar.loadFromSave(save);

    atualizarLobby();
    mostrarTela("tela-lobby");
}

/* =======================================================
   ATUALIZAR LOBBY
   ======================================================= */
function atualizarLobby() {

    const team = Database.teams.find(t => t.id === Game.teamId);
    if (!team) return;

    const logo = document.getElementById("lobby-logo");
    const nome = document.getElementById("lobby-nome-time");
    const temp = document.getElementById("lobby-temporada");
    const saldo = document.getElementById("lobby-saldo");

    logo.src = `assets/logos/${team.id}.png`;
    nome.textContent = team.name;
    temp.textContent = "Temporada: " + League.state.seasonYear;
    saldo.textContent = "Saldo: " + League.state.balance.toFixed(1) + " mi";

    // Próximo jogo
    Game.nextMatchId = Calendar.getNextMatchId(Game.teamId);
}

/* =======================================================
   CONTROLES CHAMADOS PELO UI
   ======================================================= */
window.preencherListaTimesBasico = preencherListaTimes;

window.resetGameStateForNewCareer = function () {
    // substituído pela função iniciarNovaCarreira()
};

/* =======================================================
   ABERTURAS DE TELA VIA UI
   ======================================================= */
UI.abrirCalendario = function () {
    CalendarUI.renderCalendario();
    mostrarTela("tela-calendario");
};

UI.abrirCalendarioJogo = function (matchId) {
    CalendarUI.renderDetalhe(matchId);
    mostrarTela("tela-calendario-jogo");
};

UI.voltarLobby = function () {
    atualizarLobby();
    mostrarTela("tela-lobby");
};

/* =======================================================
   FIM DO MAIN.JS
   ======================================================= */
