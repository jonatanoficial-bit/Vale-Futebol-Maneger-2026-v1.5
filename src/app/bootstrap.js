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
  if (!next.app) next.app = { build: "v0.9.0", ready: false, selectedPackId: null };
  if (!next.career) next.career = { slot: null, coach: null, clubId: null };

  if (!next.career.lineup) {
    next.career.lineup = { formationId: "4-3-3", starters: {}, bench: [] };
  } else {
    if (!next.career.lineup.formationId) next.career.lineup.formationId = "4-3-3";
    if (!next.career.lineup.starters) next.career.lineup.starters = {};
    if (!Array.isArray(next.career.lineup.bench)) next.career.lineup.bench = [];
  }

  if (!next.career.tactics) {
    next.career.tactics = { style: "BALANCED", pressing: "NORMAL", tempo: "NORMAL" };
  } else {
    if (!next.career.tactics.style) next.career.tactics.style = "BALANCED";
    if (!next.career.tactics.pressing) next.career.tactics.pressing = "NORMAL";
    if (!next.career.tactics.tempo) next.career.tactics.tempo = "NORMAL";
  }

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

  if (!next.career.playerStatus) next.career.playerStatus = {};
  if (!next.career.training) {
    next.career.training = { plan: "BALANCED", focus: "GENERAL", lastAppliedIso: null };
  } else {
    if (!next.career.training.plan) next.career.training.plan = "BALANCED";
    if (!next.career.training.focus) next.career.training.focus = "GENERAL";
    if (!("lastAppliedIso" in next.career.training)) next.career.training.lastAppliedIso = null;
  }

  // ✅ novo: seasonV3
  if (!("seasonV3" in next.career)) next.career.seasonV3 = null;

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
      app: { build: "v0.9.0", ready: false, selectedPackId: null },
      career: {
        slot: null,
        coach: null,
        clubId: null,
        lineup: { formationId: "4-3-3", starters: {}, bench: [] },
        tactics: { style: "BALANCED", pressing: "NORMAL", tempo: "NORMAL" },
        roster: { signedPlayers: [], releasedIds: [], transactions: [] },
        economy: {
          balance: 15_000_000,
          sponsor: { name: "Vale Bank (MVP)", monthly: 1_250_000 },
          lastSponsorMonth: null,
          lastMatchIncome: 0,
          ledger: []
        },
        playerStatus: {},
        training: { plan: "BALANCED", focus: "GENERAL", lastAppliedIso: null },
        seasonV3: null
      }
    })
  );

  shell.setTopbar({ title: "Vale Futebol Manager", subtitle: "Carreira • Treinador" });
  shell.setFooter({ left: "Offline • GitHub Pages", right: "v0.9.0" });

  store.setState({ ...store.getState(), app: { ...store.getState().app, ready: true } });

  router.start({ defaultRoute: "#/splash" });
})();