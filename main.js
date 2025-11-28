/* =======================================================
   VALE FUTEBOL MANAGER 2026
   main.js – Inicialização, Carregamento, Troca de Telas
   =======================================================*/

console.log("%c[MAIN] main.js carregado", "color:#C7A029; font-size:18px;");

/* =======================================================
   FUNÇÃO GLOBAL DE TROCA DE TELAS
   =======================================================*/
function mostrarTela(id) {
    document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add("ativa");
}

/* =======================================================
   GAME STATE GLOBAL (NÚCLEO DO JOGO)
   =======================================================*/
window.gameState = {
    seasonYear: 2025,
    currentTeamId: "",
    balance: 20,                     // dinheiro inicial (pode mudar depois)
    rodadaA: 1,
    rodadaB: 1,
    calendarA: [],
    calendarB: [],
};

/* =======================================================
   SALVAMENTO
   =======================================================*/
function salvarJogo() {
    localStorage.setItem("vale_fm_save", JSON.stringify(gameState));
    console.log("%c[SAVE] Jogo salvo com sucesso.", "color:#4ade80");
}

function carregarJogo() {
    const data = localStorage.getItem("vale_fm_save");
    if (!data) return false;

    try {
        const load = JSON.parse(data);
        Object.assign(gameState, load);
        console.log("%c[SAVE] Save carregado", "color:#38bdf8;");
        return true;
    } catch (e) {
        console.warn("[SAVE] Erro ao carregar save:", e);
        return false;
    }
}

/* =======================================================
   RESET COMPLETO (NOVA CARREIRA)
   =======================================================*/
function resetGameStateForNewCareer(teamId, coachName = "Técnico") {
    console.log("%c[MAIN] Nova carreira iniciada.", "color:#22d3ee;");

    gameState.currentTeamId = teamId;
    gameState.balance = 20;
    gameState.seasonYear = 2025;
    gameState.rodadaA = 1;
    gameState.rodadaB = 1;

    // Calendário completo de Série A e B
    if (typeof Calendar !== "undefined" && Calendar.gerarCalendarioTemporada) {
        gameState.calendarA = Calendar.gerarCalendarioTemporada("A");
        gameState.calendarB = Calendar.gerarCalendarioTemporada("B");
    }

    salvarJogo();
}

/* =======================================================
   ATUALIZAÇÃO DO LOBBY
   =======================================================*/
function atualizarLobbyBasico() {
    const nomeEl = document.getElementById("lobby-nome-time");
    const tempEl = document.getElementById("lobby-temporada");
    const saldoEl = document.getElementById("lobby-saldo");
    const logoEl  = document.getElementById("lobby-logo");

    const team = getTeamById(gameState.currentTeamId);

    if (nomeEl) nomeEl.textContent = team?.name ?? "Seu Time";
    if (tempEl) tempEl.textContent = "Temporada: " + gameState.seasonYear;
    if (saldoEl) saldoEl.textContent = "Saldo: " + gameState.balance + " mi";

    if (logoEl) {
        logoEl.src = "assets/logos/" + gameState.currentTeamId + ".png";
        logoEl.onerror = () => (logoEl.style.display = "none");
    }
}

/* =======================================================
   AÇÕES DOS BOTÕES (CAPA)
   =======================================================*/
window.addEventListener("load", () => {
    console.log("%c[MAIN] Sistema iniciado.", "color:#C7A029; font-size:16px;");

    const btnIniciar = document.getElementById("btn-iniciar");
    const btnContinuar = document.getElementById("btn-continuar");

    /* NOVA CARREIRA */
    btnIniciar.addEventListener("click", () => {
        console.log("[MAIN] Abrindo seleção de times...");
        mostrarTela("tela-escolha-time");

        // preenche a lista de times
        if (typeof UI !== "undefined") {
            if (typeof preencherListaTimesBasico === "function") {
                preencherListaTimesBasico();
            }
        }
    });

    /* CONTINUAR CARREIRA */
    btnContinuar.addEventListener("click", () => {
        const ok = carregarJogo();
        if (!ok) {
            alert("Nenhuma carreira encontrada.");
            return;
        }

        atualizarLobbyBasico();
        mostrarTela("tela-lobby");
    });
});

/* =======================================================
   SELEÇÃO DE TIME
   =======================================================*/
function selecionarTimeBasico(teamId) {
    const coach = prompt("Nome do treinador:", "Técnico");

    resetGameStateForNewCareer(teamId, coach);
    atualizarLobbyBasico();

    mostrarTela("tela-lobby");
}

/* =======================================================
   CALENDÁRIO – BOTÃO DO LOBBY
   =======================================================*/
window.UI = window.UI || {};

UI.abrirCalendario = function () {
    console.log("[UI] Abrindo calendário...");

    if (typeof CalendarUI !== "undefined" && CalendarUI.renderCalendario) {
        CalendarUI.renderCalendario();
    }

    mostrarTela("tela-calendario");
};

/* =======================================================
   FUNÇÕES DO JOGO – PRÓXIMO JOGO
   =======================================================*/
UI.abrirProximoJogo = function () {
    console.log("[MAIN] Chamando próximo jogo...");

    if (typeof Match !== "undefined" && typeof Match.iniciarProximoJogo === "function") {
        Match.iniciarProximoJogo();
    }

    mostrarTela("tela-partida");
};

/* =======================================================
   TABELA / ELENCO / TÁTICAS / MERCADO
   =======================================================*/
UI.voltarLobby = () => mostrarTela("tela-lobby");
UI.voltarParaCapa = () => mostrarTela("tela-capa");

/* =======================================================
   DEBUG
   =======================================================*/
console.log("%c[MAIN] main.js pronto para uso.", "color:#C7A029");
