// /src/app/bootstrap.js
import { createLogger } from "./logger.js";
import { createRepositories } from "../data/repositories.js";
import { createStore } from "./store.js";
import { createShell } from "../ui/shell.js";
import { createRouter } from "./router.js";
import { createScreenManager } from "./screenManager.js";

import { screenMenu } from "../ui/screens/menu.js";
import { screenDataPackSelect } from "../ui/screens/dataPackSelect.js";
import { screenSlots } from "../ui/screens/slots.js";
import { screenCareerCreate } from "../ui/screens/careerCreate.js";
import { screenClubSelect } from "../ui/screens/clubSelect.js";
import { screenWelcome } from "../ui/screens/welcome.js";
import { screenHub } from "../ui/screens/hub.js";

import { screenSquad } from "../ui/screens/squad.js";
import { screenPlayer } from "../ui/screens/player.js";
import { screenTactics } from "../ui/screens/tactics.js";
import { screenTraining } from "../ui/screens/training.js";
import { screenCompetitions } from "../ui/screens/competitions.js";
import { screenFinance } from "../ui/screens/finance.js";

import { screenCalendar } from "../ui/screens/calendar.js";

const logger = createLogger();
const repos = await createRepositories({ logger });

const store = createStore({
  logger,
  initial: {
    app: {
      selectedPackId: null,
      slotId: null
    },
    career: null
  }
});

const shell = createShell({ root: document.getElementById("app") });
const screens = createScreenManager({ shell, store, repos, logger });

screens.add("menu", screenMenu);
screens.add("dataPackSelect", screenDataPackSelect);
screens.add("slots", screenSlots);
screens.add("careerCreate", screenCareerCreate);
screens.add("clubSelect", screenClubSelect);
screens.add("welcome", screenWelcome);
screens.add("hub", screenHub);

screens.add("squad", screenSquad);
screens.add("player", screenPlayer);
screens.add("tactics", screenTactics);
screens.add("training", screenTraining);
screens.add("competitions", screenCompetitions);
screens.add("finance", screenFinance);

screens.add("calendar", screenCalendar);

const router = createRouter();

function onRoute(hash) {
  // rotas default
  if (!hash || hash === "#/" || hash === "#") {
    screens.show("menu");
    return;
  }

  const route = hash.replace("#/", "");
  screens.show(route);
}

router.onChange(onRoute);
router.start();

// inicial
onRoute(location.hash);
