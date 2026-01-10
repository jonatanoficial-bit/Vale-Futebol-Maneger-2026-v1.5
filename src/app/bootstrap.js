import { createRouter } from "./router.js";
import { createScreenManager } from "./screenManager.js";
import { createRepositories } from "../data/repositories.js";
import { store } from "./store.js";

import { screenStart } from "../ui/screens/start.js";
import { screenSaveSlots } from "../ui/screens/saveSlots.js";
import { screenDataPackSelect } from "../ui/screens/dataPackSelect.js";
import { screenClubSelect } from "../ui/screens/clubSelect.js";
import { screenHub } from "../ui/screens/hub.js";

async function boot() {
  const app = document.getElementById("app");

  const router = createRouter();
  const screens = createScreenManager(app, router);
  const repos = await createRepositories();

  screens.add("start", screenStart);
  screens.add("saveSlots", screenSaveSlots);
  screens.add("dataPackSelect", screenDataPackSelect);
  screens.add("clubSelect", screenClubSelect);
  screens.add("hub", screenHub);

  router.start();
}

boot().catch(err => {
  console.error(err);
  document.body.innerHTML = `
    <div style="padding:24px;color:white">
      <h2>Erro fatal</h2>
      <pre>${err.message}</pre>
    </div>
  `;
});
