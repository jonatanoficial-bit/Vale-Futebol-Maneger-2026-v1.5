import { createRouter } from "./router.js";
import { createDiagnostics, disableDiagnosticsPersist } from "./diagnostics.js";
import { createStore } from "./stateStore.js";
import { createRepositories } from "./repositories.js";
import { createScreenManager } from "./screenManager.js";
import { renderAppShell } from "../ui/appShell.js";
import { showFatal } from "../ui/fatalOverlay.js";

import { screenSplash } from "../ui/screens/splash.js";
import { screenStart } from "../ui/screens/start.js";
import { screenDataPackSelect } from "../ui/screens/dataPackSelect.js";
import { screenSlotSelect } from "../ui/screens/slotSelect.js";
import { screenCareerCreate } from "../ui/screens/careerCreate.js";
import { screenClubSelect } from "../ui/screens/clubSelect.js";
import { screenTutorial } from "../ui/screens/tutorial.js";
import { screenHub } from "../ui/screens/hub.js";
import { screenCompetitions } from "../ui/screens/competitions.js";
import { screenDiagnostics } from "../ui/screens/diagnostics.js";
import { screenNotFound } from "../ui/screens/notFound.js";

const APP_VERSION = "v1.5.0";

function getInitialState() {
  return {
    meta: { appVersion: APP_VERSION, buildLabel: "web" },
    dlc: { selectedPackId: null, packs: [], lastFetchAt: null },
    career: {
      slotIndex: null,
      role: "coach",
      coach: { name: "", nation: "Brasil", avatarId: "avatar01" },
      clubId: null,
      tutorialDone: false,
    },
    competitions: {
      seasonActive: false,
      seasonId: null,
      generatedAt: null,
      tables: {},
      calendar: [],
      results: [],
    },
    finance: { budget: 0, wageBudget: 0 },
    squad: { byClub: {} },
  };
}

function setupGlobalCrashHandler(logger) {
  window.addEventListener("error", (ev) => {
    try {
      logger?.error?.("window.error", ev?.error || ev?.message || ev);
    } catch {}
    showFatal({
      title: "Ocorreu um erro",
      message: "Copie o log abaixo e me envie.",
      log: String(ev?.error?.stack || ev?.message || ev || ""),
    });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    try {
      logger?.error?.("unhandledrejection", ev?.reason || ev);
    } catch {}
    showFatal({
      title: "Ocorreu um erro",
      message: "Copie o log abaixo e me envie.",
      log: String(ev?.reason?.stack || ev?.reason || ev || ""),
    });
  });
}

async function main() {
  const logger = createDiagnostics();
  setupGlobalCrashHandler(logger);

  const app = document.getElementById("app");
  if (!app) throw new Error("#app not found");

  // Store + repos (obrigatórios para as telas)
  const store = createStore(getInitialState());
  // Expor para compatibilidade com módulos antigos que importam ./state.js ou ./store.js
  // (útil em deploys com cache / service worker / versões antigas de telas)
  globalThis.__VFM_STORE__ = store;
  const repos = createRepositories();

  // Shell
  renderAppShell(app, { appVersion: APP_VERSION });

  // Router
  const router = createRouter({
    onRoute: (route) => {
      const screen = route.name || "splash";
      screenManager.show(screen, { route });
    },
  });

  // Screen manager
  const screenManager = createScreenManager({
    root: document.getElementById("screenRoot"),
    createContext: () => ({
      appVersion: APP_VERSION,
      buildLabel: "web",
      store,
      repos,
      navigate: (hash) => {
        window.location.hash = hash;
      },
    }),
    screens: {
      splash: screenSplash,
      start: screenStart,
      dataPackSelect: screenDataPackSelect,
      slotSelect: screenSlotSelect,
      careerCreate: screenCareerCreate,
      clubSelect: screenClubSelect,
      tutorial: screenTutorial,
      hub: screenHub,
      competitions: screenCompetitions,
      diagnostics: screenDiagnostics,
      notFound: screenNotFound,
    },
    onError: (err) => {
      try {
        logger?.error?.("screenManager.onError", err);
      } catch {}

      showFatal({
        title: "Ocorreu um erro",
        message: "Copie o log abaixo e me envie.",
        log: String(err?.stack || err || ""),
      });
    },
  });

  // Disable persistence for diagnostics on prod builds (can be toggled later)
  disableDiagnosticsPersist();

  // Start!
  router.start();
}

main();