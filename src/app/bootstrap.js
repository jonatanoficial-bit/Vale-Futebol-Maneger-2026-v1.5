// src/app/bootstrap.js
import { createRouter } from "./router.js";
import { createScreenManager } from "./screenManager.js";
import { createStore } from "./stateStore.js";
import { createLogger } from "./logger.js";

import { createRepositories } from "../data/repositories.js";
import { createAppShell } from "../ui/appShell.js";
import { showFatal } from "../ui/fatalOverlay.js";

// Screens
import { screenSplash } from "../ui/screens/splash.js";
import { screenStart } from "../ui/screens/start.js";
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
import { screenDiagnostics } from "../ui/screens/diagnostics.js";

function getInitialState() {
  return {
    app: {
      slotId: null,
      selectedPackId: null,
      locale: "pt-BR",
      build: "v1.0.1",
    },
    career: {
      role: "coach",
      coach: {
        name: "",
        country: "BR",
        avatarId: "default",
      },
      clubId: null,
    },
    season: {
      yearLabel: "2025-2026",
      competitions: [],
      active: null,
      lastCloseSummary: null,
    },
    finances: {
      balance: 15000000,
      wageMonthEstimate: 0,
      lastMatchIncome: 0,
      sponsor: {
        company: "Vale Bank (MVP)",
        monthly: 1250000,
        performanceBonus: 75000,
      },
      ledger: [],
    },
  };
}

function setupGlobalCrashHandler(logger) {
  window.addEventListener("error", (ev) => {
    try {
      const err = ev?.error || ev;
      logger?.error?.("window.error", err);
      showFatal({
        message: err?.message || String(err),
        stack: err?.stack || "",
        href: location.href,
      });
    } catch {
      // não deixa outro erro derrubar tudo
    }
  });

  window.addEventListener("unhandledrejection", (ev) => {
    try {
      const err = ev?.reason || ev;
      logger?.error?.("unhandledrejection", err);
      showFatal({
        message: err?.message || String(err),
        stack: err?.stack || "",
        href: location.href,
      });
    } catch {
      // não deixa outro erro derrubar tudo
    }
  });
}

async function main() {
  const logger = createLogger();
  setupGlobalCrashHandler(logger);

  const root = document.getElementById("app");
  if (!root) {
    showFatal({
      message: "Elemento #app não encontrado no index.html",
      stack: "",
      href: location.href,
    });
    return;
  }

  // Monta o “shell” (topbar + container)
  const shell = createAppShell(root);

  // Store + repos (obrigatórios para as telas)
  const store = createStore(getInitialState());
  const repos = createRepositories();

  // Screen manager com ctx completo
  const screenManager = createScreenManager(shell.main, { store, repos, logger });

  // Registra telas
  screenManager.setScreens({
    splash: screenSplash,
    start: screenStart,
    dataPackSelect: screenDataPackSelect,
    saveSlots: screenSaveSlots,
    careerCreate: screenCareerCreate,
    clubSelect: screenClubSelect,
    hub: screenHub,
    squad: screenSquad,
    tactics: screenTactics,
    training: screenTraining,
    competitions: screenCompetitions,
    finance: screenFinance,
    diagnostics: screenDiagnostics,
  });

  // Router
  const router = createRouter({
    defaultRoute: "#/splash",
    onRoute: (route) => {
      screenManager.show(route.name, route);
    },
  });

  router.start();
}

main().catch((err) => {
  showFatal({
    message: err?.message || String(err),
    stack: err?.stack || "",
    href: location.href,
  });
});