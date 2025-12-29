(() => {
  const NS = (window.VFM26 = window.VFM26 || {});
  NS.bootStep?.("Carregando GameCore...");

  // GameCore aqui é propositalmente “leve” na Fase 3.
  // O simulador pesado (resultados, treino, atributos, etc.) entra nas próximas fases.

  NS.GameCore = {
    version: "0.1.0",
    buildMatchPreview(career) {
      const club = career?.club?.name || "Clube";
      return {
        title: `Bem-vindo, ${career?.name || "Manager"}!`,
        subtitle: `Você assumiu: ${club}`,
        tips: [
          "Use o Lobby para gestão completa (elenco, treinos, notícias e calendário).",
          "Em fases seguintes: engine de partidas, desempenho, demissão, evoluções e mundo completo."
        ]
      };
    }
  };

  NS.bootStep?.("GameCore pronto", { version: NS.GameCore.version });
})();