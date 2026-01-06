import { createAppShell } from "../ui/appShell.js";
import { createRouter } from "./router.js";
import { createStore } from "./stateStore.js";
import { logger } from "./logger.js";

import { registerScreens } from "./screenManager.js";

import { screenSplash } from "../ui/screens/splash.js";
import { screenDataPackSelect } from "../ui/screens/dataPackSelect.js";
import { screenSaveSlots } from "../ui/screens/saveSlots.js";
import { screenCareerCreate } from "../ui/screens/careerCreate.js";
import { screenClubSelect } from "../ui/screens/clubSelect.js";
import { screenTutorial } from "../ui/screens/tutorial.js";
import { screenHub } from "../ui/screens/hub.js";
import { screenSquad } from "../ui/screens/squad.js";
import { screenPlayer } from "../ui/screens/player.js";
import { screenTactics } from "../ui/screens/tactics.js";
import { screenCompetitions } from "../ui/screens/competitions.js";

import { createRepositories } from "../data/repositories.js";

function migrateState(s) {
  const next = structuredClone(s || {});
  if (!next.app) next.app = { build: "v0.5.0", ready: false, selectedPackId: null };
  if (!next.career) next.career = { slot: null, coach: null, clubId: null };

  if (!next.career.lineup) {
    next.career.lineup = { formationId: "4-3-3", starters: {}, bench: [] };
  } else {
    if (!next.career.lineup.formationId) next.career.lineup.formationId = "4-3-3";
    if (!next.career.lineup.starters) next.career.lineup.starters = {};
    if (!next.career.lineup.bench) next.career.lineup.bench = [];
  }

  // seasonV2: lazy-init na tela Competições
  if (!("seasonV2" in next.career)) next.career.seasonV2 = null;

  return next;
}

(async function main() {
  const root = document.getElementById("app");
  if (!root) throw new Error("Elemento #app não encontrado.");

  const shell = createAppShell(root);
  const store = createStore();

  const repos = await createRepositories({ logger });

  const screens = registerScreens(shell, store, repos, logger);
  screens.add("splash", screenSplash);
  screens.add("dataPackSelect", screenDataPackSelect);
  screens.add("saveSlots", screenSaveSlots);
  screens.add("careerCreate", screenCareerCreate);
  screens.add("clubSelect", screenClubSelect);
  screens.add("tutorial", screenTutorial);
  screens.add("hub", screenHub);
  screens.add("squad", screenSquad);
  screens.add("player", screenPlayer);
  screens.add("tactics", screenTactics);
  screens.add("competitions", screenCompetitions);

  const router = createRouter({
    onRoute: (route) => screens.show(route.name, route.params),
    logger
  });

  const initial = migrateState({
    app: { build: "v0.5.0", ready: false, selectedPackId: null },
    career: {
      slot: null,
      coach: null,
      clubId: null,
      lineup: { formationId: "4-3-3", starters: {}, bench: [] },
      seasonV2: null
    }
  });

  store.setState(initial);

  shell.setTopbar({
    title: "Vale Futebol Manager",
    subtitle: "Carreira • Treinador",
  });

  shell.setFooter({
    left: "Offline • GitHub Pages",
    right: "v0.5.0"
  });

  store.setState({
    ...store.getState(),
    app: { ...store.getState().app, ready: true }
  });

  router.start({ defaultRoute: "#/splash" });
})();