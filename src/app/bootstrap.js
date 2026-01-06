// /src/app/bootstrap.js
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
import { screenTraining } from "../ui/screens/training.js";
import { screenCompetitions } from "../ui/screens/competitions.js";
import { screenTransfers } from "../ui/screens/transfers.js";
import { screenFinance } from "../ui/screens/finance.js";
import { screenAdmin } from "../ui/screens/admin.js";

import { createRepositories } from "../data/repositories.js";

function migrateState(s) {
  const next = structuredClone(s || {});
  if (!next.app) next.app = { build: "v1.0.1", ready: false, selectedPackId: null };
  if (!next.career) next.career = { slot: null, coach: null, clubId: null };

  if (!next.career.lineup) next.career.lineup = { formationId: "4-3-3", starters: {}, bench: [] };
  if (!next.career.lineup.formationId) next.career.lineup.formationId = "4-3-3";
  if (!next.career.lineup.starters) next.career.lineup.starters = {};
  if (!Array.isArray(next.career.lineup.bench)) next.career.lineup.bench = [];

  if (!next.career.tactics) next.career.tactics = { style: "BALANCED", pressing: "NORMAL", tempo: "NORMAL" };
  if (!next.career.tactics.style) next.career.tactics.style = "BALANCED";
  if (!next.career.tactics.pressing) next.career.tactics.pressing = "NORMAL";
  if (!next.career.tactics.tempo) next.career.tactics.tempo = "NORMAL";

  if (!next.career.roster) next.career.roster = { signedPlayers: [], releasedIds: [], transactions: [] };
  if (!Array.isArray(next.career.roster.signedPlayers)) next.career.roster.signedPlayers = [];
  if (!Array.isArray(next.career.roster.releasedIds)) next.career.roster.releasedIds = [];
  if (!Array.isArray(next.career.roster.transactions)) next.career.roster.transactions = [];

  if (!next.career.economy) {
    next.career.economy = {
      balance: 15_000_000,
      sponsor: { name: "Vale Bank (MVP)", monthly: 1_250_000, perfBonus: 75_000 },
      lastSponsorMonth: null,
      lastMatchIncome: 0,
      ledger: [],
      wageMonthlyEstimate: 0,
      lastWageMonth: null
    };
  } else {
    const e = next.career.economy;
    if (typeof e.balance !== "number") e.balance = 15_000_000;
    if (!e.sponsor) e.sponsor = { name: "Vale Bank (MVP)", monthly: 1_250_000, perfBonus: 75_000 };
    if (typeof e.sponsor.monthly !== "number") e.sponsor.monthly = 1_250_000;
    if (typeof e.sponsor.perfBonus !== "number") e.sponsor.perfBonus = 75_000;
    if (!("lastSponsorMonth" in e)) e.lastSponsorMonth = null;
    if (!("lastMatchIncome" in e)) e.lastMatchIncome = 0;
    if (!Array.isArray(e.ledger)) e.ledger = [];
    if (!("wageMonthlyEstimate" in e)) e.wageMonthlyEstimate = 0;
    if (!("lastWageMonth" in e)) e.lastWageMonth = null;
  }

  if (!next.career.playerStatus) next.career.playerStatus = {};
  if (!next.career.training) next.career.training = { plan: "BALANCED", focus: "GENERAL", lastAppliedIso: null };

  if (!next.career.transfers) {
    next.career.transfers = { marketSeed: "GLOBAL", market: [], offers: [], inbox: [] };
  } else {
    if (!Array.isArray(next.career.transfers.market)) next.career.transfers.market = [];
    if (!Array.isArray(next.career.transfers.offers)) next.career.transfers.offers = [];
    if (!Array.isArray(next.career.transfers.inbox)) next.career.transfers.inbox = [];
    if (!next.career.transfers.marketSeed) next.career.transfers.marketSeed = "GLOBAL";
  }

  if (!("seasonV3" in next.career)) next.career.seasonV3 = null;
  if (!("seasonV4" in next.career)) next.career.seasonV4 = null;
  if (!("seasonV5" in next.career)) next.career.seasonV5 = null;

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
  screens.add("training", screenTraining);
  screens.add("competitions", screenCompetitions);
  screens.add("transfers", screenTransfers);
  screens.add("finance", screenFinance);
  screens.add("admin", screenAdmin);

  const router = createRouter({
    onRoute: (route) => screens.show(route.name, route.params),
    logger
  });

  store.setState(
    migrateState({
      app: { build: "v1.0.1", ready: false, selectedPackId: null },
      career: {
        slot: null,
        coach: null,
        clubId: null,
        lineup: { formationId: "4-3-3", starters: {}, bench: [] },
        tactics: { style: "BALANCED", pressing: "NORMAL", tempo: "NORMAL" },
        roster: { signedPlayers: [], releasedIds: [], transactions: [] },
        economy: {
          balance: 15_000_000,
          sponsor: { name: "Vale Bank (MVP)", monthly: 1_250_000, perfBonus: 75_000 },
          lastSponsorMonth: null,
          lastMatchIncome: 0,
          ledger: [],
          wageMonthlyEstimate: 0,
          lastWageMonth: null
        },
        playerStatus: {},
        training: { plan: "BALANCED", focus: "GENERAL", lastAppliedIso: null },
        transfers: { marketSeed: "GLOBAL", market: [], offers: [], inbox: [] },
        seasonV3: null,
        seasonV4: null,
        seasonV5: null
      }
    })
  );

  shell.setTopbar({ title: "Vale Futebol Manager", subtitle: "Carreira • Treinador" });
  shell.setFooter({ left: "Offline • GitHub Pages", right: "v1.0.1" });

  store.setState({ ...store.getState(), app: { ...store.getState().app, ready: true } });

  router.start({ defaultRoute: "#/splash" });
})();