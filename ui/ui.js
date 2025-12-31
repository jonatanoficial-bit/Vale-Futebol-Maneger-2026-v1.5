// ui/ui.js
// Router + telas base do fluxo obrigatório:
// Cover -> DataPack -> Save Slot -> Criar Carreira -> Lobby
(function(){
  const NS = (window.VFM26 = window.VFM26 || {});
  const UI = (NS.UI = NS.UI || {});

  const routes = Object.create(null);
  let appEl = null;

  function ensureRoot(){
    if (appEl) return appEl;
    appEl = document.getElementById('app');
    if (!appEl) {
      appEl = document.createElement('div');
      appEl.id = 'app';
      document.body.appendChild(appEl);
    }
    return appEl;
  }

  function escapeHtml(s){
    return String(s ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  UI.init = function init(){
    ensureRoot();
  };

  UI.register = function register(name, fn){
    routes[name] = fn;
  };

  UI.go = async function go(name, params){
    try {
      const root = ensureRoot();
      const fn = routes[name];
      if (!fn) {
        root.innerHTML = `
          <div class="err-page">
            <h1>Erro crítico</h1>
            <p>Rota inválida: <b>${escapeHtml(name)}</b></p>
            <button class="btn" onclick="location.reload()">Recarregar</button>
          </div>`;
        return;
      }
      await fn({ root, params: params || {} });
    } catch (e) {
      console.error('[UI] erro ao renderizar rota', name, e);
      const root = ensureRoot();
      root.innerHTML = `
        <div class="err-page">
          <h1>Erro crítico</h1>
          <p>${escapeHtml(e?.message || e)}</p>
          <button class="btn" onclick="location.reload()">Recarregar</button>
        </div>`;
    }
  };

  // ====== TELA 1: COVER (tela inicial) ======
  UI.register('cover', ({ root }) => {
    root.innerHTML = `
      <div class="vfm-bg">
        <div class="vfm-panel">
          <div class="vfm-title">VALE FUTEBOL MANAGER 2026</div>
          <div class="vfm-subtitle">Simulador de futebol manager. Base sólida pronta.<br/>Agora: DataPack e Saves.</div>

          <div class="vfm-card">
            <div class="vfm-card-title">MODO CARREIRA</div>
            <div class="vfm-card-text">Fluxo obrigatório: DataPack → Save Slot → Carreira.</div>
          </div>

          <div class="vfm-row">
            <button class="vfm-btn" id="btnStart">INICIAR</button>
          </div>
        </div>
      </div>`;

    const btn = root.querySelector('#btnStart');
    btn?.addEventListener('click', () => UI.go('datapack'));
  });

  // Aliases seguros (se algum lugar chamar 'home')
  UI.register('home', (ctx) => UI.go('cover', ctx?.params));

  // ====== TELA 2: DATAPACK ======
  UI.register('datapack', async ({ root }) => {
    root.innerHTML = `
      <div class="vfm-bg">
        <div class="vfm-panel">
          <div class="vfm-title">ESCOLHER DATAPACK</div>
          <div class="vfm-subtitle">Sem mexer no código do jogo: os packs são arquivos JSON em <b>/packs</b>.</div>
          <div class="vfm-card" id="packBox"><div class="vfm-card-text">Carregando packs...</div></div>
          <div class="vfm-row">
            <button class="vfm-btn vfm-btn-secondary" id="back">VOLTAR</button>
          </div>
        </div>
      </div>`;

    root.querySelector('#back')?.addEventListener('click', () => UI.go('cover'));

    const box = root.querySelector('#packBox');
    if (!NS.Game || !NS.Game.loadCatalog) {
      box.innerHTML = `<div class="vfm-card-text">Erro: Game.loadCatalog não disponível.</div>`;
      return;
    }

    const catalog = await NS.Game.loadCatalog();
    const list = (catalog?.packs || []).slice();
    if (!list.length) {
      box.innerHTML = `<div class="vfm-card-text">Nenhum pack encontrado em <b>packs/catalog.json</b></div>`;
      return;
    }

    box.innerHTML = `
      <div class="vfm-card-title" style="margin-bottom:10px">Disponíveis</div>
      <div class="vfm-list" id="packList"></div>`;

    const packList = root.querySelector('#packList');
    list.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'vfm-chip';
      btn.textContent = p?.name || p?.id;
      btn.addEventListener('click', async () => {
        try {
          await NS.Game.selectPack(p.id);
          UI.go('saves');
        } catch (e) {
          alert('Falha ao carregar pack: ' + (e?.message || e));
        }
      });
      packList?.appendChild(btn);
    });
  });

  // ====== TELA 3: SAVE SLOT ======
  UI.register('saves', ({ root }) => {
    const st = NS.Game?.state || {};
    const currentPack = st.packId || '(nenhum)';

    root.innerHTML = `
      <div class="vfm-bg">
        <div class="vfm-panel">
          <div class="vfm-title">ESCOLHER SAVE SLOT</div>
          <div class="vfm-subtitle">Pack atual: <b>${escapeHtml(currentPack)}</b></div>
          <div class="vfm-card" id="slotsBox"></div>
          <div class="vfm-row">
            <button class="vfm-btn vfm-btn-secondary" id="back">VOLTAR</button>
          </div>
        </div>
      </div>`;

    root.querySelector('#back')?.addEventListener('click', () => UI.go('datapack'));

    const slotsBox = root.querySelector('#slotsBox');
    if (!NS.Game || !NS.Game.getSlotState || !NS.Game.selectSlot) {
      slotsBox.innerHTML = `<div class="vfm-card-text">Erro: Game.getSlotState/selectSlot não disponível.</div>`;
      return;
    }

    const slots = [1, 2].map(i => ({ i, data: NS.Game.getSlotState(i) }));
    slotsBox.innerHTML = `
      <div class="vfm-card-title" style="margin-bottom:10px">Selecione o slot</div>
      <div class="vfm-list" id="slotList"></div>`;

    const slotList = root.querySelector('#slotList');
    slots.forEach(({ i, data }) => {
      const hasCareer = !!data?.career;
      const label = hasCareer
        ? `Slot ${i}: ${data.career.managerName || 'Carreira'} - ${data.career.clubName || ''}`
        : `Slot ${i}: (vazio)`;

      const btn = document.createElement('button');
      btn.className = 'vfm-chip';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        NS.Game.selectSlot(i);
        if (hasCareer) {
          // Carrega e vai direto ao lobby
          try { NS.Game.loadCareerFromCurrentSlot(); } catch {}
          UI.go('lobby');
        } else {
          UI.go('career');
        }
      });
      slotList?.appendChild(btn);
    });
  });

  // ====== TELA 4: CRIAR CARREIRA ======
  UI.register('career', ({ root }) => {
    // Usa o módulo existente ui/career-ui.js (não reescrever/"destruir")
    const Career = NS.UI?.Career;
    if (!Career || typeof Career.start !== 'function') {
      root.innerHTML = `
        <div class="err-page">
          <h1>Erro crítico</h1>
          <p>Career UI não encontrado. Verifique se <b>ui/career-ui.js</b> está carregando.</p>
          <button class="btn" onclick="location.reload()">Recarregar</button>
        </div>`;
      return;
    }
    Career.start(root);
  });

})();
