// src/app/bootstrap.js
import { createRouter } from "./router.js";
import { registerScreens } from "./screenManager.js";
import { createStore } from "./stateStore.js";
import { logger } from "./logger.js";

import { createRepositories } from "../data/repositories.js";
import { createAppShell } from "../ui/appShell.js";

// Screens (as que realmente existem no zip)
import { screenSplash } from "../ui/screens/splash.js";
import { screenDataPackSelect } from "../ui/screens/dataPackSelect.js";
import { screenSaveSlots } from "../ui/screens/saveSlots.js";
import { screenCareerCreate } from "../ui/screens/careerCreate.js";
import { screenClubSelect } from "../ui/screens/clubSelect.js";
import { screenTutorial } from "../ui/screens/tutorial.js";
import { screenHub } from "../ui/screens/hub.js";
import { screenSquad } from "../ui/screens/squad.js";
import { screenTactics } from "../ui/screens/tactics.js";
import { screenTraining } from "../ui/screens/training.js";
import { screenCalendar } from "../ui/screens/calendar.js";
import { screenCompetitions } from "../ui/screens/competitions.js";
import { screenFinance } from "../ui/screens/finance.js";
import { screenAdmin } from "../ui/screens/admin.js";
import { screenTransfers } from "../ui/screens/transfers.js";
import { screenPlayer } from "../ui/screens/player.js";

function initialState() {
  return {
    app: {
      selectedPackId: null,
      slotId: null,
      locale: "pt-BR",
      build: "v1.5",
    },
    career: {
      slot: null,
      coach: null, // será criado na CareerCreate
      clubId: null,
    },
    season: {
      yearLabel: "2025-2026",
      competitions: [],
      active: null,
    },
    finances: {
      balance: 15000000,
      sponsor: {
        company: "Vale Bank (MVP)",
        monthly: 1250000,
        performanceBonus: 75000,
      },
      ledger: [],
    },
  };
}

function routeToScreenName(route) {
  const first = route?.segments?.[0] || "";
  const name = String(first).trim();

  // aliases de segurança (hub tem botão “menu”, versões antigas usavam “start”)
  if (!name || name === "") return "splash";
  if (name === "menu") return "splash";
  if (name === "start") return "splash";

  return name;
}

async function main() {
  const root = document.getElementById("app");
  if (!root) {
    document.body.innerHTML = `<pre style="color:white;padding:16px">ERRO: #app não encontrado</pre>`;
    return;
  }

  const shell = createAppShell(root);
  const store = createStore();
  store.setState(initialState());

  const repos = createRepositories({ logger });

  // registra telas no registry compatível com seu screenManager.js
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
  screens.add("training", screenTraining);

  screens.add("calendar", screenCalendar);
  screens.add("competitions", screenCompetitions);
  screens.add("finance", screenFinance);

  screens.add("admin", screenAdmin);
  screens.add("transfers", screenTransfers);

  // rota “menu”/“start” apontam para splash sem quebrar
  screens.add("menu", screenSplash);
  screens.add("start", screenSplash);

  // Router: o seu router só chama onRoute(parseHash())
  const router = createRouter({
    onRoute: (route) => {
      const screenName = routeToScreenName(route);
      screens.show(screenName, route);
    },
  });

  // Se não tiver hash, entra na splash
  if (!window.location.hash) {
    window.location.hash = "#/splash";
  }

  router.start();
}

// fatal seguro (se algo estourar)
main().catch((err) => {
  console.error(err);
  const fatal = document.querySelector("#fatal");
  if (fatal) {
    fatal.classList.add("fatal--show");
    fatal.setAttribute("aria-hidden", "false");
    const pre = document.querySelector("#fatalPre");
    if (pre) {
      pre.textContent = JSON.stringify(
        { message: err?.message || String(err), stack: err?.stack || null, href: location.href },
        null,
        2
      );
    }
  } else {
    document.body.innerHTML = `<pre style="color:white;padding:16px">${String(err?.stack || err)}</pre>`;
  }
});