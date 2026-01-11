import { createAppShell } from "../ui/appShell.js";
import { createRouter } from "./router.js";
import { createScreenManager } from "./screenManager.js";
import { createStore } from "./stateStore.js";
import { getPackRegistrySafe } from "./packRegistry.js";
import { createRepositories } from "../data/repositories.js";
import { createLogger } from "./logger.js";
import { maybeRunSelfTest } from "./selfTest.js";

// Screens
import { screenSplash } from "../ui/screens/splash.js";
import { screenDataPackSelect } from "../ui/screens/dataPackSelect.js";
import { screenSaveSlots } from "../ui/screens/saveSlots.js";
import { screenCareerCreate } from "../ui/screens/careerCreate.js";
import { screenClubSelect } from "../ui/screens/clubSelect.js";
import { screenHub } from "../ui/screens/hub.js";
import { screenSquad } from "../ui/screens/squad.js";
import { screenTactics } from "../ui/screens/tactics.js";
import { screenTraining } from "../ui/screens/training.js";
import { screenCompetitions } from "../ui/screens/competitions.js";
import { screenFinance } from "../ui/screens/finance.js";

function routeToScreen(route) {
  // route.segments vem do router.js (#/x/y)
  const first = (route?.segments?.[0] || "splash").trim();
  return first || "splash";
}

function makeNavigator() {
  return function navigate(path) {
    const clean = String(path || "").replace(/^#?\//, "");
    window.location.hash = `#/${clean}`;
  };
}

async function main() {
  const logger = createLogger();

  const root = document.querySelector("#app");
  if (!root) {
    console.error("Elemento #app não encontrado no index.html");
    return;
  }

  const shell = createAppShell(root);

  // Store (persistente e simples)
  const store = createStore({
    initialState: {
      selectedPackId: null,
      selectedSaveSlot: null,
      career: null,
    },
    persistKey: "vfm_state_v1",
  });

  // Repos (packs, saves, etc)
  const repos = createRepositories({
    packRegistry: getPackRegistrySafe(),
  });

  // Screen manager
  const screens = createScreenManager(shell, store, repos);

  // Register screens
  screens.register("splash", screenSplash);
  screens.register("dataPackSelect", screenDataPackSelect);
  screens.register("saveSlots", screenSaveSlots);
  screens.register("careerCreate", screenCareerCreate);
  screens.register("clubSelect", screenClubSelect);
  screens.register("hub", screenHub);
  screens.register("squad", screenSquad);
  screens.register("tactics", screenTactics);
  screens.register("training", screenTraining);
  screens.register("competitions", screenCompetitions);
  screens.register("finance", screenFinance);

  const navigate = makeNavigator();

  // Router
  const router = createRouter({
    onRoute: async (route) => {
      try {
        const screenName = routeToScreen(route);
        await screens.show(screenName, { navigate, route });
      } catch (err) {
        logger.error(err);
        shell.showFatal(err);
      }
    },
  });

  // Erros globais => fatal
  window.addEventListener("error", (ev) => {
    logger.error(ev?.error || ev);
    shell.showFatal(ev?.error || ev);
  });
  window.addEventListener("unhandledrejection", (ev) => {
    logger.error(ev?.reason || ev);
    shell.showFatal(ev?.reason || ev);
  });

  // Start router
  router.start();

  // Se já tem hash, o router chama; se não tem, cai na splash.
  if (!window.location.hash) navigate("splash");

  // Ferramenta opcional de diagnóstico (só roda com selftest=1)
  await maybeRunSelfTest({ store, repos, screenManager: screens, logger });
}

main();