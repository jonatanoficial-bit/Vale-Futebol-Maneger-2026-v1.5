// src/app/bootstrap.js

import { createRouter } from "./router.js";
import { registerScreens } from "./screenManager.js";
import { createStore } from "./stateStore.js";
import { createRepositories } from "../data/repositories.js";
import { createAppShell } from "../ui/appShell.js";

import { generateRosterForClub } from "../domain/rosterGenerator.js";
import { generateMinimalSeason } from "../domain/season/minimalSeasonGenerator.js";

// Screens
import { screenSplash } from "../ui/screens/splash.js";
import { screenDataPackSelect } from "../ui/screens/dataPackSelect.js";
import { screenSaveSlots } from "../ui/screens/saveSlots.js";
import { screenCareerCreate } from "../ui/screens/careerCreate.js";
import { screenClubSelect } from "../ui/screens/clubSelect.js";
import { screenHub } from "../ui/screens/hub.js";
import { screenSquad } from "../ui/screens/squad.js";
import { screenCompetitions } from "../ui/screens/competitions.js";

function ensureGameState(store) {
  const s = store.getState();

  if (!s.career || !s.career.clubId) return;

  // Elenco
  if (!s.players || s.players.length === 0) {
    s.players = generateRosterForClub(s.career.clubId);
  }

  // Club básico
  if (!s.clubs) {
    s.clubs = [
      { id: s.career.clubId, name: "Meu Clube" },
      { id: "CPU_1", name: "Rival FC" },
      { id: "CPU_2", name: "Atlético Demo" },
      { id: "CPU_3", name: "União Teste" },
    ];
  }

  // Temporada
  if (!s.season) {
    s.season = generateMinimalSeason(s.clubs);
  }

  store.setState(s);
}

async function main() {
  const root = document.getElementById("app");
  const shell = createAppShell(root);
  const store = createStore({});
  const repos = createRepositories();

  const screens = registerScreens(shell, store, repos);

  screens.add("splash", screenSplash);
  screens.add("dataPackSelect", screenDataPackSelect);
  screens.add("saveSlots", screenSaveSlots);
  screens.add("careerCreate", screenCareerCreate);
  screens.add("clubSelect", screenClubSelect);
  screens.add("hub", screenHub);
  screens.add("squad", screenSquad);
  screens.add("competitions", screenCompetitions);

  const router = createRouter({
    onRoute: (route) => {
      ensureGameState(store);
      screens.show(route.segments[0] || "splash", route);
    },
  });

  if (!location.hash) location.hash = "#/splash";
  router.start();
}

main();