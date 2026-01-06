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
import { screenTransfers } from "../ui/screens/transfers.js";
import { screenFinance } from "../ui/screens/finance.js";

import { createRepositories } from "../data/repositories.js";

function migrateState(s) {
  const next = structuredClone(s || {});
  if (!next.app) next.app = { build: "v0.6.0", ready: false, selectedPackId: null };
  if (!next.career) next.career = { slot: null, coach: null, clubId: null };

  if (!next.career.lineup) {
    next.career.lineup = { formationId: "4-3-3", starters: {}, bench: [] };
  } else {
    if (!next.career.lineup.formationId) next.career.lineup.formationId = "4-3-3";
    if (!next.career.lineup.starters) next.career.lineup.starters = {};
    if (!next.career.lineup.bench) next.career.lineup.bench = [];
  }

  if (!("seasonV2" in next.career)) next.career.seasonV2 = null;

  if (!next.career.roster) {
    next.career.roster = { signedPlayers: [], releasedIds: [], transactions: [] };
  } else {
    if (!Array.isArray(next.career.roster.signedPlayers)) next.career.roster.signedPlayers = [];
    if (!Array.isArray(next.career.roster.releasedIds)) next.career.roster.releasedIds = [];
    if (!Array.isArray(next.career.roster.transactions)) next.career.roster.transactions = [];
  }

  if (!next.career.economy) {
    next.career.economy = {
      balance: 15_000_000,
      sponsor: { name: "Vale Bank (MVP)", monthly: 1_250_000 },
      lastSponsorMonth: null,
      lastMatchIncome: 0,
      ledger: []
    };
  } else {
    if (typeof next.career.economy.balance !== "number") next.career.economy.balance = 15_000_000;
    if (!next.career.economy.sponsor) next.career.economy.sponsor = { name: "Vale Bank (MVP)", monthly: 1_250_000 };
    if (!("lastSponsorMonth" in next.career.economy)) next.career.economy.lastSponsorMonth = null;
    if (!("lastMatchIncome" in next.career.economy)) next.career.economy.lastMatchIncome = 0;
    if (!Array.isArray(next.career.economy.ledger)) next.career.economy.ledger = [];
  }

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

  // ✅ NOVAS TELAS (garante que rotas existem)
  screens.add("transfers", screenTransfers);
  screens.add("finance", screenFinance);

  const router = createRouter({
    onRoute: (route) => screens.show(route.name, route.params),
    logger
  });

  store.setState(
    migrateState({
      app: { build: "v0.6.0", ready: false, selectedPackId: null },
      career: {
        slot: null,
        coach: null,
        clubId: null,
        lineup: { formationId: "4-3-3", starters: {}, bench: [] },
        seasonV2: null,
        roster: { signedPlayers: [], releasedIds: [], transactions: [] },
        economy: {
          balance: 15_000_000,
          sponsor: { name: "Vale Bank (MVP)", monthly: 1_250_000 },
          lastSponsorMonth: null,
          lastMatchIncome: 0,
          ledger: []
        }
      }
    })
  );

  shell.setTopbar({ title: "Vale Futebol Manager", subtitle: "Carreira • Treinador" });
  shell.setFooter({ left: "Offline • GitHub Pages", right: "v0.6.0" });

  store.setState({ ...store.getState(), app: { ...store.getState().app, ready: true } });

  router.start({ defaultRoute: "#/splash" });
})();