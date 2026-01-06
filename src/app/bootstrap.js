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

import { createRepositories } from "../data/repositories.js";

(async function main() {
  const root = document.getElementById("app");
  if (!root) throw new Error("Elemento #app não encontrado.");

  const shell = createAppShell(root);
  const store = createStore();

  // Repositórios (dados/saves)
  const repos = await createRepositories({ logger });

  // Screens
  const screens = registerScreens(shell, store, repos, logger);
  screens.add("splash", screenSplash);
  screens.add("dataPackSelect", screenDataPackSelect);
  screens.add("saveSlots", screenSaveSlots);
  screens.add("careerCreate", screenCareerCreate);
  screens.add("clubSelect", screenClubSelect);
  screens.add("tutorial", screenTutorial);
  screens.add("hub", screenHub);

  // Router
  const router = createRouter({
    onRoute: (route) => screens.show(route.name, route.params),
    logger
  });

  // Estado inicial
  store.setState({
    app: {
      build: "v0.1.0",
      ready: false,
      selectedPackId: null
    },
    career: {
      slot: null,
      coach: null,
      clubId: null
    }
  });

  // Boot
  shell.setTopbar({
    title: "Vale Futebol Manager",
    subtitle: "Carreira • Treinador",
  });

  shell.setFooter({
    left: "Offline • GitHub Pages",
    right: "v0.1.0"
  });

  store.setState({
    ...store.getState(),
    app: { ...store.getState().app, ready: true }
  });

  // rota inicial
  router.start({ defaultRoute: "#/splash" });
})();