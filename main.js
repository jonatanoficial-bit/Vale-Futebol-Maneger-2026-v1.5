/* =======================================================
   VALE FUTEBOL MANAGER 2026
   main.js – Inicialização do jogo e troca de telas
   =======================================================*/

window.addEventListener("load", () => {
    console.log(
        "%c Vale Futebol Manager 2026 iniciado!",
        "color:#C7A029; font-size:20px; font-weight:bold"
    );

    // Se existir um UI "antigo", continua chamando
    if (window.UI && typeof UI.init === "function") {
        UI.init();
    }

    // Garante que o botão INICIAR sempre monte a lista de times
    const btnIniciar = document.getElementById("btn-iniciar");
    if (btnIniciar) {
        btnIniciar.addEventListener("click", () => {
            // pequena espera só pra garantir troca de tela
            setTimeout(preencherListaTimesBasico, 50);
        });
    }

    // Botão CONTINUAR CARREIRA (se já houver save)
    const btnContinuar = document.getElementById("btn-continuar");
    if (btnContinuar) {
        btnContinuar.addEventListener("click", () => {
            if (typeof loadGameStateFromStorage === "function") {
                loadGameStateFromStorage(); // sua função da engine
            }
            atualizarLobbyBasico();
            mostrarTela("tela-lobby");
        });
    }
});

/* =======================================================
   Troca de telas (sistema único – usado também pelo fallback)
   =======================================================*/
function mostrarTela(id) {
    document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add("ativa");
}

/* =======================================================
   Estado global simplificado (segue seu padrão antigo)
   =======================================================*/
window.Game = {
    data: {},       // save completo (se quiser usar depois)
    coachName: "",
    teamId: "",
    rodada: 1,
    saldo: 50,
    formacao: "4-3-3",
    estilo: "equilibrado",

    elenco: [],     // jogadores carregados
    titulares: {},  // 11 posições
    reservas: []    // banco
};

/* =======================================================
   FALLBACK: montar lista de times na tela "ESCOLHA SEU TIME"
   =======================================================*/
function preencherListaTimesBasico() {
    const container = document.getElementById("lista-times");
    if (!container) return;

    // Se o UI antigo já preencheu, não mexe
    if (container.children.length > 0) return;

    // Fonte de dados: Database.teams (novo) ou teams (global antigo)
    const fonte = (window.Database && Database.teams)
        ? Database.teams
        : (window.teams || []);

    if (!fonte || !fonte.length) {
        console.warn("Nenhum time encontrado em Database.teams ou teams.");
        return;
    }

    container.innerHTML = "";

    fonte.forEach(team => {
        const card = document.createElement("button");
        card.className = "time-card";
        card.innerHTML = `
            <div class="time-card-inner">
                <img src="assets/logos/${team.id}.png"
                     alt="${team.name}"
                     class="time-card-logo"
                     onerror="this.style.display='none'">
                <span class="time-card-nome">${team.name}</span>
            </div>
        `;
        card.addEventListener("click", () => selecionarTimeBasico(team.id));
        container.appendChild(card);
    });
}

/* =======================================================
   Seleção de time – cria carreira e vai para o lobby
   =======================================================*/
function selecionarTimeBasico(teamId) {
    const coachName = prompt("Nome do treinador:", "Técnico");

    // Usa a engine que já existe (game.js)
    if (typeof resetGameStateForNewCareer === "function") {
        resetGameStateForNewCareer(teamId, coachName || "Técnico");
    }

    Game.teamId = teamId;
    Game.coachName = coachName || "Técnico";

    atualizarLobbyBasico();
    mostrarTela("tela-lobby");
}

/* =======================================================
   Atualiza visual do LOBBY (nome, temporada, saldo, escudo)
   =======================================================*/
function atualizarLobbyBasico() {
    if (typeof getTeamById !== "function" || typeof gameState === "undefined") {
        console.warn("Engine do jogo (getTeamById / gameState) não encontrada.");
        return;
    }

    const team = getTeamById(Game.teamId);
    if (!team) return;

    const nomeEl  = document.getElementById("lobby-nome-time");
    const tempEl  = document.getElementById("lobby-temporada");
    const saldoEl = document.getElementById("lobby-saldo");
    const logoEl  = document.getElementById("lobby-logo");

    if (nomeEl)  nomeEl.textContent  = team.name;
    if (tempEl)  tempEl.textContent  = `Temporada: ${gameState.seasonYear}`;
    if (saldoEl) saldoEl.textContent = `Saldo: ${gameState.balance} mi`;

    if (logoEl) {
        // 1ª tentativa: usar propriedade 'logo' se existir
        let logoFile = null;
        if (team.logo) {
            logoFile = team.logo;              // ex: "FLA.png"
        } else if (team.id) {
            logoFile = `${team.id}.png`;       // ex: "FLA.png"
        }

        if (logoFile) {
            logoEl.src = `assets/logos/${logoFile}`;
            logoEl.alt = team.name;
            logoEl.onerror = function () {
                // fallback se a imagem não existir
                this.onerror = null;
                this.src = "assets/logos/default.png";
            };
        }
    }
}
