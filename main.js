/* =======================================================
   VALE FUTEBOL MANAGER 2026
   main.js — Inicialização do jogo e troca de telas
   Revisado 100% funcional
   =======================================================*/

console.log(
    "%c[MAIN] Vale Futebol Manager 2026 carregado",
    "color:#C7A029; font-size:16px; font-weight:bold"
);

/* =======================================================
   SISTEMA DE TROCA DE TELAS (GLOBAL)
   =======================================================*/
function mostrarTela(id) {
    document.querySelectorAll(".tela").forEach((t) => t.classList.remove("ativa"));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add("ativa");
}

/* =======================================================
   ESTADO GLOBAL DO JOGO
   (Game = sessão atual / gameState = save completo)
   =======================================================*/
window.Game = {
    coachName: "",
    teamId: "",
    rodada: 1,
    saldo: 10,
    formacao: "4-3-3",
    estilo: "equilibrado",
};

/* =======================================================
   INICIALIZAÇÃO GERAL
   =======================================================*/
window.addEventListener("load", () => {
    console.log("[MAIN] Sistema iniciado.");

    // Restaurar carreira automaticamente se existir
    if (window.Save && typeof Save.carregar === "function") {
        const save = Save.carregar();
        if (save) {
            console.log("[MAIN] Save encontrado, habilitando botão CONTINUAR.");
            document.getElementById("btn-continuar").style.display = "block";
        }
    }

    configurarBotoes();
});

/* =======================================================
   CONFIGURA TODOS OS BOTÕES DO JOGO
   =======================================================*/
function configurarBotoes() {
    // --- NOVA CARREIRA ---
    document.getElementById("btn-iniciar").onclick = () => {
        console.log("[MAIN] Iniciar nova carreira…");

        if (window.Save && typeof Save.novoJogo === "function") {
            Save.novoJogo();
        }

        mostrarTela("tela-escolha-time");

        // Preencher lista de times
        if (typeof preencherListaTimesBasico === "function") {
            setTimeout(preencherListaTimesBasico, 80);
        } else {
            console.error("[MAIN] preencherListaTimesBasico() NÃO ENCONTRADA!");
        }
    };

    // --- CONTINUAR CARREIRA ---
    document.getElementById("btn-continuar").onclick = () => {
        console.log("[MAIN] Continuar carreira…");

        if (window.Save && typeof Save.carregar === "function") {
            Save.carregar();
        }

        carregarLobby();
        mostrarTela("tela-lobby");
    };
}

/* =======================================================
   SELEÇÃO DE TIME
   =======================================================*/
function selecionarTimeBasico(teamId) {
    console.log("[MAIN] Time escolhido:", teamId);

    const nome = prompt("Nome do treinador:", "Técnico") || "Técnico";

    Game.teamId = teamId;
    Game.coachName = nome;

    if (window.resetGameStateForNewCareer) {
        resetGameStateForNewCareer(teamId, nome);
    }

    carregarLobby();
    mostrarTela("tela-lobby");

    if (window.Save && typeof Save.salvar === "function") {
        Save.salvar();
    }
}

/* =======================================================
   ATUALIZAR LOBBY
   =======================================================*/
function carregarLobby() {
    if (!Game.teamId) {
        console.warn("[MAIN] Nenhum time selecionado!");
        return;
    }

    const team = getTeamById(Game.teamId);
    if (!team) {
        console.error("[MAIN] getTeamById retornou NULL para:", Game.teamId);
        return;
    }

    document.getElementById("lobby-nome-time").textContent = team.name;
    document.getElementById("lobby-saldo").textContent = "Saldo: " + (gameState.balance || 0) + " mi";
    document.getElementById("lobby-temporada").textContent = "Temporada: " + (gameState.seasonYear || 2025);

    const logo = document.getElementById("lobby-logo");
    logo.src = `assets/logos/${team.id}.png`;
    logo.onerror = () => (logo.style.display = "none");
}

/* =======================================================
   BOTÕES DE NAVEGAÇÃO GERAL
   =======================================================*/
window.UI = Object.assign(window.UI || {}, {
    voltarParaCapa() {
        mostrarTela("tela-capa");
    },

    voltarLobby() {
        carregarLobby();
        mostrarTela("tela-lobby");
    },
});

/* =======================================================
   FUNÇÃO DE FALLBACK (CASO UI NÃO MONTE OS TIMES)
   =======================================================*/
function preencherListaTimesBasico() {
    console.log("[MAIN] preenchendo lista de times…");

    const div = document.getElementById("lista-times");
    if (!div) {
        console.error("[MAIN] lista-times NÃO encontrada!");
        return;
    }

    const fonte =
        (window.Database && Database.teams) ||
        window.teams ||
        [];

    if (!fonte.length) {
        console.error("[MAIN] Nenhum time encontrado no database!");
        div.innerHTML = "<p>Nenhum time encontrado.</p>";
        return;
    }

    div.innerHTML = "";

    fonte.forEach((team) => {
        const card = document.createElement("button");
        card.className = "time-card";
        card.innerHTML = `
            <img class="time-card-logo" src="assets/logos/${team.id}.png" alt="${team.name}" />
            <span class="time-card-nome">${team.name}</span>
        `;
        card.onclick = () => selecionarTimeBasico(team.id);

        div.appendChild(card);
    });
}

