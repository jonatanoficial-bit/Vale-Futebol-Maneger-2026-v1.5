/* ============================================================
   VALE FUTEBOL MANAGER 2026
   calendar.js — Engine de calendário anual da temporada
   ============================================================ */

window.Calendar = {
    season: [],
    pointer: 0,

    /* ============================================================
       GERAR TEMPORADA COMPLETA
       ============================================================ */
    buildSeasonCalendar() {
        console.log("%c[CALENDAR] Criando calendário da temporada...", "color:#0EA5E9;");

        const teamsA = Database.teams.filter(t => t.serie === "A");
        const teamsB = Database.teams.filter(t => t.serie === "B");

        this.season = [];
        this.pointer = 0;

        // Gera datas automáticas
        const datas = this._generateDates(38);

        // Série A
        const jogosA = League.generateRoundRobin(teamsA.map(t => t.id));
        jogosA.forEach((match, idx) => {
            this.season.push({
                id: "A" + idx,
                division: "A",
                round: idx + 1,
                date: datas[idx],
                home: match.home,
                away: match.away,
                played: false,
                scoreHome: null,
                scoreAway: null
            });
        });

        // Série B
        const jogosB = League.generateRoundRobin(teamsB.map(t => t.id));
        jogosB.forEach((match, idx) => {
            this.season.push({
                id: "B" + idx,
                division: "B",
                round: idx + 1,
                date: datas[idx],
                home: match.home,
                away: match.away,
                played: false,
                scoreHome: null,
                scoreAway: null
            });
        });

        console.log("%c[CALENDAR] Temporada criada com " + this.season.length + " jogos.", "color:lime;");
    },

    /* ============================================================
       GERAÇÃO DE DATAS AUTOMÁTICAS
       ============================================================ */
    _generateDates(rodadas) {
        const dates = [];
        let d = new Date("2025-04-08");

        for (let i = 0; i < rodadas; i++) {
            dates.push(new Date(d));
            d.setDate(d.getDate() + 7); // uma rodada por semana
        }

        return dates;
    },

    /* ============================================================
       OBTER PRÓXIMO JOGO DO USUÁRIO
       ============================================================ */
    getNextMatchId(teamId) {
        const jogo = this.season.find(m =>
            !m.played && (m.home === teamId || m.away === teamId)
        );
        return jogo ? jogo.id : null;
    },

    /* ============================================================
       MARCAR JOGO COMO CONCLUÍDO
       ============================================================ */
    finishMatch(matchId, gh, ga) {
        const jogo = this.season.find(m => m.id === matchId);
        if (!jogo) return;

        jogo.played = true;
        jogo.scoreHome = gh;
        jogo.scoreAway = ga;

        Save.saveSeason();
    },

    /* ============================================================
       CARREGAR DO SAVE
       ============================================================ */
    loadFromSave(save) {
        if (!save || !save.calendar) return;
        this.season = save.calendar.season;
        this.pointer = save.calendar.pointer || 0;
    }
};
