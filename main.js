/* =======================================================
   VALE FUTEBOL MANAGER 2026
   main.js – Inicialização do jogo e troca de telas
   =======================================================*/

/**
 * Função genérica para trocar de tela.
 * Qualquer DIV com class="tela" entra/sai ao adicionar/remover .ativa
 */
function mostrarTela(id) {
    document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativa"));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add("ativa");
}

window.addEventListener("load", () => {
    console.log(
        "%c Vale Futebol Manager 2026 iniciado!",
        "color:#C7A029; font-size:20px; font-weight:bold"
    );

    // 1) Deixa o UI oficial iniciar se existir
    if (window.UI && typeof UI.init === "function") {
        UI.init();
        console.log("[UI] init() chamado (ui.js).");
    } else {
        console.warn("[UI] ui.js não encontrado ou sem init().");
    }

    // 2) Garante funcionamento dos botões da CAPA
    const btnIniciar = document.getElementById("btn-iniciar");
    const btnContinuar = document.getElementById("btn-continuar");

    if (btnIniciar) {
        btnIniciar.addEventListener("click", () => {
            console.log("[MAIN] INICIAR CARREIRA clicado.");

            // Se o UI moderno tiver função específica, usa ela.
            if (window.UI && typeof UI.abrirEscolhaTime === "function") {
                UI.abrirEscolhaTime();
                return;
            }

            // Se tiver função para preencher lista de times
            if (window.UI && typeof UI.preencherListaTimes === "function") {
                UI.preencherListaTimes();
            }

            // Fallback: apenas abre a tela de escolha de time
            mostrarTela("tela-escolha-time");
        });
    }

    if (btnContinuar) {
        btnContinuar.addEventListener("click", () => {
            console.log("[MAIN] CONTINUAR CARREIRA clicado.");

            if (window.UI && typeof UI.continuarCarreira === "function") {
                UI.continuarCarreira();
                return;
            }

            // Se não existir save / função específica,
            // trata como "novo jogo" mesmo.
            if (btnIniciar) {
                btnIniciar.click();
            } else {
                mostrarTela("tela-escolha-time");
            }
        });
    }

    // 3) "Watchdog" do Lobby
    //    Fica verificando a cada 500ms se o Lobby está ativo
    //    e, se estiver, garante que logo / textos estejam preenchidos
    setInterval(() => {
        const telaLobby = document.getElementById("tela-lobby");
        if (!telaLobby || !telaLobby.classList.contains("ativa")) return;

        const logoEl  = document.getElementById("lobby-logo");
        const nomeEl  = document.getElementById("lobby-nome-time");
        const tempEl  = document.getElementById("lobby-temporada");
        const saldoEl = document.getElementById("lobby-saldo");

        if (!logoEl) return;

        // Usa a engine oficial, se estiver carregada
        if (typeof getTeamById === "function" && window.gameState) {
            const teamId = gameState.currentTeamId || gameState.teamId;
            if (!teamId) return;

            const team = getTeamById(teamId);
            if (!team) return;

            // Atualiza logo (só se ainda não estiver certo)
            const expectedSrc = `${location.origin}${location.pathname.replace(/index\.html?$/i, "")}assets/logos/${team.id}.png`;
            if (!logoEl.src || logoEl.src.endsWith("/") || logoEl.src.includes("default") || logoEl.src === location.href) {
                logoEl.src = `assets/logos/${team.id}.png`;
                logoEl.alt = team.name;
            }

            // Nome do time
            if (nomeEl && (!nomeEl.textContent || nomeEl.textContent === "")) {
                nomeEl.textContent = team.name;
            }

            // Temporada e saldo
            if (tempEl) {
                tempEl.textContent = `Temporada: ${gameState.seasonYear || 2025}`;
            }
            if (saldoEl && typeof gameState.balance !== "undefined") {
                saldoEl.textContent = `Saldo: ${gameState.balance} mi`;
            }
        }
    }, 500);
});
