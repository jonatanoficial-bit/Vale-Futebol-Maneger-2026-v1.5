// src/app/router.js
// Router simples por hash (#/rota). Mantém compatibilidade com o bootstrap atual
// (que usa createRouter) e também expõe navigate() para telas que precisem.

function norm(hash) {
  const h = (hash ?? "").toString();
  if (!h) return "#/";
  if (h.startsWith("#/")) return h;
  if (h.startsWith("#")) return "#/" + h.slice(1);
  return "#/" + h;
}

export function getRoute() {
  return norm(window.location.hash || "#/");
}

export function navigate(to) {
  window.location.hash = norm(to);
}

export function createRouter(onRoute) {
  if (typeof onRoute !== "function") {
    throw new Error("createRouter(onRoute): onRoute precisa ser function");
  }

  const handler = () => {
    try {
      onRoute(getRoute());
    } catch (e) {
      // Não quebra a página silenciosamente: joga no console
      console.error("[router] onRoute error:", e);
      throw e;
    }
  };

  window.addEventListener("hashchange", handler);

  return {
    start() {
      handler();
    },
    stop() {
      window.removeEventListener("hashchange", handler);
    },
    go(to) {
      navigate(to);
    },
    current() {
      return getRoute();
    },
  };
}
