function getFlag() {
  // suporta ?selftest=1 (query) e #/rota?selftest=1 (hash)
  const fromSearch = new URLSearchParams(window.location.search).get("selftest");
  if (fromSearch) return fromSearch;

  const hash = window.location.hash || "";
  const q = hash.includes("?") ? hash.split("?")[1] : "";
  if (!q) return null;
  return new URLSearchParams(q).get("selftest");
}

function createPanel() {
  const wrap = document.createElement("div");
  wrap.id = "selftest-panel";
  wrap.style.position = "fixed";
  wrap.style.right = "12px";
  wrap.style.bottom = "12px";
  wrap.style.zIndex = "999999";
  wrap.style.width = "360px";
  wrap.style.maxWidth = "calc(100vw - 24px)";
  wrap.style.maxHeight = "45vh";
  wrap.style.overflow = "auto";
  wrap.style.padding = "10px";
  wrap.style.borderRadius = "14px";
  wrap.style.background = "rgba(0,0,0,0.72)";
  wrap.style.border = "1px solid rgba(255,255,255,0.14)";
  wrap.style.backdropFilter = "blur(10px)";
  wrap.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial";
  wrap.style.fontSize = "12px";
  wrap.style.color = "#fff";

  const title = document.createElement("div");
  title.style.display = "flex";
  title.style.justifyContent = "space-between";
  title.style.alignItems = "center";
  title.style.gap = "8px";

  const h = document.createElement("div");
  h.textContent = "SelfTest (debug)";
  h.style.fontWeight = "700";
  h.style.fontSize = "13px";

  const close = document.createElement("button");
  close.textContent = "Fechar";
  close.style.cursor = "pointer";
  close.style.border = "1px solid rgba(255,255,255,0.18)";
  close.style.background = "transparent";
  close.style.color = "#fff";
  close.style.borderRadius = "10px";
  close.style.padding = "4px 8px";
  close.onclick = () => wrap.remove();

  title.appendChild(h);
  title.appendChild(close);

  const body = document.createElement("div");
  body.id = "selftest-body";
  body.style.marginTop = "8px";
  body.style.display = "grid";
  body.style.gap = "6px";

  wrap.appendChild(title);
  wrap.appendChild(body);
  document.body.appendChild(wrap);
  return body;
}

function line(body, ok, name, detail = "") {
  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "18px 1fr";
  row.style.gap = "8px";
  row.style.alignItems = "start";

  const dot = document.createElement("div");
  dot.textContent = ok ? "✅" : "❌";

  const txt = document.createElement("div");
  txt.innerHTML = `<div style="font-weight:600">${name}</div>${
    detail ? `<div style="opacity:.85; margin-top:2px; white-space:pre-wrap">${detail}</div>` : ""
  }`;

  row.appendChild(dot);
  row.appendChild(txt);
  body.appendChild(row);
}

export async function maybeRunSelfTest({ store, repos, screenManager, logger }) {
  const flag = getFlag();
  if (!flag || flag === "0" || flag === "false") return;

  const body = createPanel();

  // snapshot do state (pra não interferir)
  const stateBefore = structuredClone(store.getState());

  const tests = [
    {
      name: "Store inicial acessível",
      run: async () => {
        const st = store.getState();
        if (!st || typeof st !== "object") throw new Error("store.getState() não retornou objeto");
        return "OK";
      },
    },
    {
      name: "PackRegistry (repos.listPacks) carrega",
      run: async () => {
        const packs = await repos.listPacks();
        if (!Array.isArray(packs)) throw new Error("listPacks não retornou array");
        return `packs: ${packs.length}`;
      },
    },
    {
      name: "Router/ScreenManager: tela splash renderiza",
      run: async () => {
        await screenManager.show("splash", { navigate: (p) => (window.location.hash = "#/" + p) });
        return "OK";
      },
    },
  ];

  // roda testes
  for (const t of tests) {
    try {
      const detail = await t.run();
      line(body, true, t.name, String(detail || ""));
    } catch (e) {
      const msg = e && e.stack ? e.stack : String(e);
      line(body, false, t.name, msg);
      if (logger?.error) logger.error(e);
      else console.error(e);
    }
  }

  // restaura state (risco 0)
  store.setState(stateBefore);

  // listener global de erros (só em selftest)
  window.addEventListener("error", (ev) => {
    line(body, false, "window.onerror", String(ev?.error?.stack || ev?.message || ev));
  });

  window.addEventListener("unhandledrejection", (ev) => {
    line(body, false, "unhandledrejection", String(ev?.reason?.stack || ev?.reason || ev));
  });
}