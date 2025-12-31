(() => {
  const NS = (window.VFM26 = window.VFM26 || {});
  NS.bootStep?.("Carregando GameCore...");

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function makeRosterForClub(club) {
    const base = typeof club?.rating === "number" ? club.rating : 75;
    const seed = hashString(String(club?.id || "club"));
    const rnd = mulberry32(seed);

    const positions = [
      { pos: "GK", count: 3 },
      { pos: "RB", count: 2 },
      { pos: "LB", count: 2 },
      { pos: "CB", count: 4 },
      { pos: "DM", count: 2 },
      { pos: "CM", count: 4 },
      { pos: "AM", count: 2 },
      { pos: "RW", count: 2 },
      { pos: "LW", count: 2 },
      { pos: "ST", count: 3 }
    ];

    const firstNames = [
      "João", "Pedro", "Lucas", "Mateus", "Gabriel", "Rafael", "Bruno", "Caio", "Renan", "Diego",
      "Thiago", "Igor", "Vitor", "Danilo", "Arthur", "Gustavo", "Henrique", "Felipe", "André", "Eduardo"
    ];
    const lastNames = [
      "Silva", "Santos", "Oliveira", "Souza", "Costa", "Pereira", "Almeida", "Ferreira", "Rodrigues", "Gomes",
      "Martins", "Araujo", "Barbosa", "Ribeiro", "Carvalho", "Teixeira", "Lima", "Correia", "Mendes", "Nunes"
    ];

    const players = [];
    let number = 1;

    positions.forEach((grp) => {
      for (let i = 0; i < grp.count; i++) {
        const fn = firstNames[Math.floor(rnd() * firstNames.length)];
        const ln = lastNames[Math.floor(rnd() * lastNames.length)];
        const age = 17 + Math.floor(rnd() * 18); // 17-34
        const potential = clamp(base + Math.floor((rnd() - 0.35) * 18), 55, 92);

        // variação por posição
        const posBias =
          grp.pos === "GK" ? 0 :
          grp.pos === "CB" ? -1 :
          grp.pos === "ST" ? +1 :
          grp.pos === "AM" ? +1 :
          0;

        const overall = clamp(base + posBias + Math.floor((rnd() - 0.5) * 10), 50, 90);

        players.push({
          id: `${club.id}_${grp.pos}_${i + 1}`,
          name: `${fn} ${ln}`,
          pos: grp.pos,
          age,
          number: number++,
          overall,
          potential,
          morale: clamp(60 + Math.floor(rnd() * 35), 40, 99),
          fitness: clamp(70 + Math.floor(rnd() * 30), 50, 100),
          value: Math.round((overall * 90000 + potential * 60000) * (0.6 + rnd() * 0.8))
        });
      }
    });

    // ordena por overall
    players.sort((a, b) => b.overall - a.overall);
    return players;
  }

  function makeNewsFeed(career) {
    const club = career?.club?.name || "seu clube";
    const role = career?.role || "coach";
    const roleLabel = role === "president" ? "Presidente" : role === "sporting" ? "Diretor Esportivo" : "Treinador";

    return [
      {
        id: "n1",
        title: `Apresentação oficial: ${career?.name || "Manager"} assume o ${club}`,
        body: `${roleLabel} inicia trabalho e promete foco em resultados e evolução do elenco.`
      },
      {
        id: "n2",
        title: `Bastidores: comissão define prioridades para a semana`,
        body: `Planejamento inclui análise de elenco, treinos e preparação de calendário (Fase 4).`
      },
      {
        id: "n3",
        title: `Mercado: monitoramento inicial`,
        body: `Na Fase 3, as telas já existem; negociações completas entram na próxima etapa.`
      }
    ];
  }

  function makeFinanceSnapshot(club) {
    const baseBudget = typeof club?.budget === "number" ? club.budget : 25000000;
    return {
      budget: baseBudget,
      wageBudget: Math.round(baseBudget * 0.18),
      incomeMonthly: Math.round(baseBudget * 0.06),
      expensesMonthly: Math.round(baseBudget * 0.045)
    };
  }

  NS.GameCore = {
    version: "0.3.0",

    // Textos do Lobby (topo)
    buildLobbyHeader(career) {
      const club = career?.club?.name || "Clube";
      return {
        title: "Lobby",
        subtitle: `Você assumiu: ${club}`,
        welcome: `Bem-vindo, ${career?.name || "Manager"}!`
      };
    },

    // Menus por cargo (Fase 3: estrutura + placeholders)
    getLobbyMenu(role) {
      const common = [
        { id: "news", label: "Notícias" },
        { id: "agenda", label: "Agenda" },
        { id: "stats", label: "Estatísticas" }
      ];

      if (role === "president") {
        return [
          { id: "finance", label: "Finanças" },
          { id: "squad", label: "Elenco" },
          ...common
        ];
      }

      if (role === "sporting") {
        return [
          { id: "squad", label: "Elenco" },
          { id: "transfers", label: "Mercado" },
          ...common
        ];
      }

      // coach
      return [
        { id: "squad", label: "Elenco" },
        { id: "training", label: "Treinos" },
        ...common
      ];
    },

    // Dados base por carreira (Fase 3)
    buildCareerData(career) {
      const club = career?.club || { id: "CLUB", name: "Clube", rating: 75, budget: 25000000 };
      return {
        roster: makeRosterForClub(club),
        news: makeNewsFeed(career),
        finance: makeFinanceSnapshot(club)
      };
    }
  };

  NS.bootStep?.("GameCore pronto", { version: NS.GameCore.version });
})();