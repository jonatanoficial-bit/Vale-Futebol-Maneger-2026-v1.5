/* ============================================================
   VALE FUTEBOL MANAGER 2026
   calendar-ui.js — Interface do Calendário da Temporada
   ============================================================ */

window.CalendarUI = {

    /* ============================================================
       TELA DO CALENDÁRIO COMPLETO
       ============================================================ */
    renderCalendario() {
        console.log("%c[CALENDAR UI] Renderizando calendário...", "color:#C7A029;");

        const lista = document.getElementById("lista-calendario");
        lista.innerHTML = "";

        Calendar.season.forEach(match => {
            const home = Database.teams.find(t => t.id === match.home);
            const away = Database.teams.find(t => t.id === match.away);

            const item = document.createElement("div");
            item.className = "linha-calendario";

            const dataBR = new Date(match.date).toLocaleDateString("pt-BR");

            item.innerHTML = `
                <div class="cal-dia">${dataBR}</div>
                <div class="cal-jogo">
                    <img src="assets/logos/${home.id}.png" class="cal-logo">
                    <span>${home.name}</span>
                    <strong>vs</strong>
                    <span>${away.name}</span>
                    <img src="assets/logos/${away.id}.png" class="cal-logo">
                </div>
                <div class="cal-status">
                    ${match.played ? `${match.scoreHome} x ${match.scoreAway}` : "A jogar"}
                </div>
            `;

            // clique = detalhes do jogo
            item.addEventListener("click", () => {
                this.renderDetalhe(match.id);
                mostrarTela("tela-calendario-jogo");
            });

            lista.appendChild(item);
        });
    },

    /* ============================================================
       DETALHE DO JOGO
       ============================================================ */
    renderDetalhe(matchId) {
        const box = document.getElementById("detalhe-calendario");
        const m = Calendar.season.find(x => x.id === matchId);

        if (!m) {
            box.innerHTML = "<p>Jogo não encontrado.</p>";
            return;
        }

        const home = Database.teams.find(t => t.id === m.home);
        const away = Database.teams.find(t => t.id === m.away);

        const dataBR = new Date(m.date).toLocaleDateString("pt-BR");

        box.innerHTML = `
            <h2>${home.name} vs ${away.name}</h2>
            <p>${dataBR}</p>

            <div class="det-jogo-block">
                <img src="assets/logos/${home.id}.png" class="det-logo">
                <span class="det-placar">
                    ${m.played ? m.scoreHome : "–"}  
                    x  
                    ${m.played ? m.scoreAway : "–"}
                </span>
                <img src="assets/logos/${away.id}.png" class="det-logo">
            </div>

            <div class="det-info">
                ${
                    m.played
                    ? "<p style='color:lime'>Partida já realizada.</p>"
                    : "<p>Partida ainda não jogada.</p>"
                }
            </div>

            ${
                (m.home === Game.teamId || m.away === Game.teamId) && !m.played
                ? `<button class="btn-principal" onclick="CalendarUI.jogarPartida('${matchId}')">JOGAR ESTA PARTIDA</button>`
                : ""
            }

            <button class="btn-voltar" onclick="mostrarTela('tela-calendario')">VOLTAR</button>
        `;
    },

    /* ============================================================
       JOGAR PARTIDA DIRETO PELO CALENDÁRIO
       ============================================================ */
    jogarPartida(matchId) {
        console.log("%c[CALENDAR UI] Jogando partida pelo calendário...", "color:orange;");

        Match.iniciarPartidaDireta(matchId);
        mostrarTela("tela-partida");
    }
};
