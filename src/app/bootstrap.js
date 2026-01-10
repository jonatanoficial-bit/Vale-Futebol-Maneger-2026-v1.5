// src/app/bootstrap.js

import { createRouter } from "./router.js";
import { createScreenManager } from "./screenManager.js";
import { enableDiagnostics } from "./diagnostics.js";

import { screenHome } from "../ui/screens/home.js";
import { screenAdmin } from "../ui/screens/admin.js";
import { screenDataPackSelect } from "../ui/screens/dataPackSelect.js";
import { screenSaveSlots } from "../ui/screens/saveSlots.js";
import { screenCareerCreate } from "../ui/screens/careerCreate.js";
import { screenClubSelect } from "../ui/screens/clubSelect.js";
import { screenHub } from "../ui/screens/hub.js";

import { screenSquad } from "../ui/screens/squad.js";
import { screenPlayer } from "../ui/screens/player.js";

import { screenTactics } from "../ui/screens/tactics.js";
import { screenTraining } from "../ui/screens/training.js";
import { screenCompetitions } from "../ui/screens/competitions.js";
import { screenFinance } from "../ui/screens/finance.js";

// 1) Diagnostics primeiro: pega qualquer erro cedo
enableDiagnostics();

// 2) App init
const root = document.querySelector("#app");
if (!root) {
  throw new Error("Elemento #app não encontrado no index.html");
}

const screens = createScreenManager(root);

// 3) Registra telas
screens.add("home", screenHome);
screens.add("admin", screenAdmin);

screens.add("dataPackSelect", screenDataPackSelect);
screens.add("saveSlots", screenSaveSlots);
screens.add("careerCreate", screenCareerCreate);
screens.add("clubSelect", screenClubSelect);

screens.add("hub", screenHub);

screens.add("squad", screenSquad);
screens.add("player", screenPlayer);

screens.add("tactics", screenTactics);
screens.add("training", screenTraining);
screens.add("competitions", screenCompetitions);
screens.add("finance", screenFinance);

// 4) Router
const router = createRouter(async (hash) => {
  // hash: "#/hub" etc.
  const route = (hash || "#/home").replace(/^#\//, "");
  await screens.show(route);
});

router.start();

// 5) Runner de diagnóstico (só quando pedir)
const qs = new URLSearchParams(location.search);
if (qs.get("diag") === "1") {
  // Import dinâmico evita “pesar” o jogo normal.
  import("./diagnosticsRunner.js")
    .then((m) => m.runDiagnosticsRunner())
    .catch((e) => {
      console.error("Falha ao iniciar diagnosticsRunner:", e);
      // Não derruba o app.
    });
}
