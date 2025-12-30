(() => {
  // UI Core (Router + Render Helpers)
  // Expected by boot.js: NS.UI.init() and NS.UI.go(route, params)

  const NS = (window.NS = window.NS || {});
  NS.UI = NS.UI || {};

  // Helpers
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function safeText(v, fallback = '') {
    if (v === null || v === undefined) return fallback;
    return String(v);
  }

  function fmtMoney(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return '-';
    try {
      return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
    } catch {
      return `R$ ${Math.round(n)}`;
    }
  }

  // Root mount
  const mountId = 'app';

  function ensureMount() {
    let el = document.getElementById(mountId);
    if (!el) {
      el = document.createElement('div');
      el.id = mountId;
      document.body.appendChild(el);
    }
    return el;
  }

  // Simple state
  const state = {
    currentRoute: null,
    currentParams: {},
    views: {},       // route -> { render(ctx), onEnter?, onLeave? }
    initialized: false,
  };

  function bootLog(step) {
    if (!window.BOOT_STEPS) window.BOOT_STEPS = [];
    window.BOOT_STEPS.push(step);
    try {
      console.log('[BOOT_STEPS]', step);
    } catch {}
  }

  function setTitle(title) {
    if (!title) return;
    try { document.title = title; } catch {}
  }

  // UI Shell
  function shell(html) {
    const root = ensureMount();
    root.innerHTML = html;
  }

  function card({ title, subtitle, body, actions } = {}) {
    const t = title ? `<h1 class="title">${title}</h1>` : '';
    const st = subtitle ? `<p class="subtitle">${subtitle}</p>` : '';
    const b = body ? `<div class="body">${body}</div>` : '';
    const a = actions ? `<div class="actions">${actions}</div>` : '';
    return `
      <div class="screen">
        <div class="card">
          ${t}
          ${st}
          ${b}
          ${a}
        </div>
      </div>
    `;
  }

  function btn(label, onClick, extraClass = '') {
    const id = `btn_${Math.random().toString(16).slice(2)}`;
    queueMicrotask(() => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', onClick);
    });
    return `<button id="${id}" class="btn ${extraClass}">${label}</button>`;
  }

  function btnLink(label, route, params = {}, extraClass = '') {
    return btn(label, () => NS.UI.go(route, params), extraClass);
  }

  function toast(msg) {
    alert(msg);
  }

  // API: register views
  function register(route, view) {
    state.views[route] = view;
  }

  function getView(route) {
    return state.views[route] || null;
  }

  // Navigation
  function go(route, params = {}) {
    const next = safeText(route);
    const view = getView(next);

    if (!view) {
      shell(
        card({
          title: 'Erro crítico',
          subtitle: `Rota não encontrada: ${next}`,
          body: `<p>Verifique o registro da tela.</p>`,
          actions: btnLink('Voltar ao início', 'home', {}, 'primary'),
        })
      );
      return;
    }

    // Leave hook
    const prevRoute = state.currentRoute;
    const prevView = prevRoute ? getView(prevRoute) : null;
    try {
      prevView?.onLeave?.({ route: prevRoute, params: state.currentParams });
    } catch (e) {
      console.warn('UI onLeave error', e);
    }

    state.currentRoute = next;
    state.currentParams = params || {};

    try {
      const ctx = {
        NS,
        state,
        route: next,
        params: state.currentParams,
        $, $$,
        shell,
        card,
        btn,
        btnLink,
        toast,
        fmtMoney,
        setTitle,
      };

      const html = view.render(ctx);
      shell(html);

      // Enter hook
      try {
        view.onEnter?.(ctx);
      } catch (e) {
        console.warn('UI onEnter error', e);
      }

      // hash sync (optional)
      try {
        const q = encodeURIComponent(JSON.stringify(state.currentParams || {}));
        window.location.hash = `#/${encodeURIComponent(next)}?p=${q}`;
      } catch {}
    } catch (e) {
      console.error('UI render error', e);
      shell(
        card({
          title: 'Erro crítico',
          subtitle: 'Falha ao renderizar UI',
          body: `<pre style="white-space:pre-wrap">${safeText(e?.stack || e)}</pre>`,
          actions: btnLink('Voltar', 'home', {}, 'primary'),
        })
      );
    }
  }

  // Hash routing (optional)
  function parseHash() {
    const h = window.location.hash || '';
    if (!h.startsWith('#/')) return null;

    const [pathPart, queryPart] = h.slice(2).split('?');
    const route = decodeURIComponent(pathPart || '');
    let params = {};
    if (queryPart) {
      const qp = new URLSearchParams(queryPart);
      const p = qp.get('p');
      if (p) {
        try { params = JSON.parse(decodeURIComponent(p)); } catch {}
      }
    }
    return { route, params };
  }

  function attachHashListener() {
    window.addEventListener('hashchange', () => {
      const parsed = parseHash();
      if (!parsed) return;
      if (parsed.route && parsed.route !== state.currentRoute) {
        go(parsed.route, parsed.params || {});
      }
    });
  }

  // API: init
  function init() {
    if (state.initialized) return;
    state.initialized = true;

    bootLog('UI.init() chamado');
    ensureMount();
    attachHashListener();

    // If we have a hash route, go to it; otherwise, do nothing
    const parsed = parseHash();
    if (parsed?.route) {
      go(parsed.route, parsed.params || {});
    }
  }

  // Public API
  NS.UI.init = init;
  NS.UI.go = go;
  NS.UI.register = register;

  // Default home screen (fallback, can be overridden)
  register('home', {
    render() {
      return card({
        title: 'VALE FUTEBOL MANAGER 2026',
        subtitle: 'Simulador de futebol manager. Base sólida pronta. Agora: DataPack e Saves.',
        body: `
          <h2 class="section-title">MODO CARREIRA</h2>
          <p>Fluxo obrigatório: DataPack → Save Slot → Carreira.</p>
          <p class="muted">Carregando UI...</p>
        `,
        actions: `
          ${btnLink('INICIAR', 'datapack', {}, 'primary')}
        `,
      });
    },
  });

})();