/* ui/ui.js */
(() => {
  const UI = {};

  UI._state = {
    route: 'home',
    packId: null,
    packData: null,
    catalog: [],
    saveSlot: 1,
    saves: [null, null],
    currentSave: null,
    game: null
  };

  UI._el = (sel, root = document) => root.querySelector(sel);

  UI._h = (tag, attrs = {}, children = []) => {
    const el = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    });
    (children || []).forEach(c => {
      if (c == null) return;
      if (typeof c === 'string') el.appendChild(document.createTextNode(c));
      else el.appendChild(c);
    });
    return el;
  };

  UI._setApp = (node) => {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = '';
    app.appendChild(node);
  };

  UI._card = (title, subtitle, bodyNode, footerNode) => {
    const wrap = UI._h('div', { class: 'screen bg' }, [
      UI._h('div', { class: 'panel' }, [
        UI._h('div', { class: 'panel-head' }, [
          UI._h('div', { class: 'title', html: title || '' }),
          subtitle ? UI._h('div', { class: 'subtitle', html: subtitle }) : null
        ]),
        UI._h('div', { class: 'panel-body' }, [bodyNode]),
        footerNode ? UI._h('div', { class: 'panel-footer' }, [footerNode]) : null
      ])
    ]);
    return wrap;
  };

  UI._btn = (label, cls, onClick) =>
    UI._h('button', { class: `btn ${cls || ''}`, onclick: onClick }, [label]);

  UI._input = (value, placeholder, onInput) => {
    const i = UI._h('input', { class: 'input', value: value || '', placeholder: placeholder || '' });
    i.addEventListener('input', (e) => onInput && onInput(e.target.value));
    return i;
  };

  UI._select = (options, value, onChange) => {
    const s = UI._h('select', { class: 'select' });
    (options || []).forEach(opt => {
      const o = UI._h('option', { value: String(opt.value) }, [opt.label]);
      if (String(opt.value) === String(value)) o.selected = true;
      s.appendChild(o);
    });
    s.addEventListener('change', (e) => onChange && onChange(e.target.value));
    return s;
  };

  UI._loadSaves = () => {
    try {
      const raw = localStorage.getItem('VFM26_SAVES');
      const data = raw ? JSON.parse(raw) : null;
      if (Array.isArray(data) && data.length === 2) UI._state.saves = data;
    } catch (_) {}
  };

  UI._saveSaves = () => {
    try { localStorage.setItem('VFM26_SAVES', JSON.stringify(UI._state.saves)); } catch (_) {}
  };

  UI.init = (game) => {
    UI._state.game = game || null;
    UI._loadSaves();
  };

  UI.go = (route, params = {}) => {
    UI._state.route = route;
    UI._state = { ...UI._state, ...(params || {}) };

    if (route === 'home') return UI._renderHome();
    if (route === 'datapack') return UI._renderDataPack();
    if (route === 'saves') return UI._renderSaves();
    if (route === 'career') return UI._renderCareer();
    if (route === 'lobby') return UI._renderLobby();

    UI._renderError(`Rota inválida: ${route}`);
  };

  UI.start = (game) => {
    UI.init(game);
    UI.go('home');
  };

  UI._renderHome = () => {
    const body = UI._h('div', {}, [
      UI._h('div', { class: 'bigtitle', html: 'VALE FUTEBOL MANAGER 2026' }),
      UI._h('div', { class: 'text', html: 'Simulador de futebol manager. Base sólida pronta.<br>Agora: DataPack e Saves.' }),
      UI._h('div', { class: 'spacer' }),
      UI._h('div', { class: 'sectiontitle', html: 'MODO CARREIRA' }),
      UI._h('div', { class: 'text', html: 'Fluxo obrigatório: DataPack → Save Slot → Carreira.' }),
      UI._h('div', { class: 'chip', html: `Engine v${(window.VFM26 && window.VFM26.Engine && window.VFM26.Engine.version) ? window.VFM26.Engine.version : '?'}` }),
    ]);

    const footer = UI._h('div', { class: 'row' }, [
      UI._btn('INICIAR', 'primary', () => UI.go('datapack'))
    ]);

    UI._setApp(UI._card('', '', body, footer));
  };

  UI._renderDataPack = async () => {
    const msg = UI._h('div', { class: 'text', html: 'Sem mexer no código do jogo: os packs são arquivos JSON em /packs.' });

    const listBox = UI._h('div', { class: 'box' }, [
      UI._h('div', { class: 'text dim', html: 'Carregando packs...' })
    ]);

    const footer = UI._h('div', { class: 'row' }, [
      UI._btn('VOLTAR', 'ghost', () => UI.go('home')),
      UI._btn('CONTINUAR', 'primary', () => {
        if (!UI._state.packId) return alert('Escolha um pack.');
        UI.go('saves');
      })
    ]);

    UI._setApp(UI._card('ESCOLHER DATAPACK', '', UI._h('div', {}, [msg, UI._h('div', { class: 'spacer' }), listBox]), footer));

    // Carregar catálogo
    let catalog = [];
    try {
      const r = await fetch('packs/catalog.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('catalog fetch failed');
      catalog = await r.json();
    } catch (e) {
      listBox.innerHTML = '';
      listBox.appendChild(UI._h('div', { class: 'text', html: 'Nenhum pack encontrado em packs/catalog.json' }));
      UI._state.catalog = [];
      return;
    }

    UI._state.catalog = Array.isArray(catalog) ? catalog : [];
    listBox.innerHTML = '';

    if (!UI._state.catalog.length) {
      listBox.appendChild(UI._h('div', { class: 'text', html: 'Nenhum pack disponível no catálogo.' }));
      return;
    }

    const opts = UI._state.catalog.map(p => ({
      value: p.id,
      label: `${p.name || p.id} (${p.id})`
    }));

    const sel = UI._select(opts, UI._state.packId || opts[0].value, (v) => {
      UI._state.packId = v;
    });

    UI._state.packId = UI._state.packId || opts[0].value;
    listBox.appendChild(sel);
  };

  UI._renderSaves = () => {
    const body = UI._h('div', {}, [
      UI._h('div', { class: 'text', html: 'Escolha um slot de salvamento.' }),
      UI._h('div', { class: 'spacer' })
    ]);

    const slots = UI._h('div', { class: 'col' });

    [1, 2].forEach((n, idx) => {
      const data = UI._state.saves[idx];
      const title = data ? `Slot ${n} — ${data.managerName} (${data.clubName})` : `Slot ${n} — Vazio`;
      const sub = data ? `Pack: ${data.packId} | Cargo: ${data.role}` : 'Crie uma carreira nova neste slot.';
      const row = UI._h('div', { class: 'slot' }, [
        UI._h('div', { class: 'slot-title', html: title }),
        UI._h('div', { class: 'slot-sub', html: sub }),
      ]);
      row.addEventListener('click', () => {
        UI._state.saveSlot = n;
        UI._state.currentSave = data;
        UI.go('career');
      });
      slots.appendChild(row);
    });

    body.appendChild(slots);

    const footer = UI._h('div', { class: 'row' }, [
      UI._btn('VOLTAR', 'ghost', () => UI.go('datapack'))
    ]);

    UI._setApp(UI._card('ESCOLHER SAVE SLOT', '', body, footer));
  };

  UI._renderCareer = async () => {
    const packId = UI._state.packId;
    const slot = UI._state.saveSlot;

    let packData = null;
    try {
      const r = await fetch(`packs/${packId}_pack.json`, { cache: 'no-store' });
      if (!r.ok) throw new Error('pack fetch failed');
      packData = await r.json();
    } catch (e) {
      return UI._renderError(`Falha ao carregar packs/${packId}_pack.json`);
    }

    UI._state.packData = packData;

    const existing = UI._state.saves[slot - 1];

    const managerNameInit = existing?.managerName || 'Jonatan';
    const countryInit = existing?.country || 'Brasil';
    const roleInit = existing?.role || 'coach';

    const clubs = UI._getClubsFromPack(packData);
    const clubInit = existing?.clubId || (clubs[0] ? clubs[0].id : '');

    const body = UI._h('div', { class: 'col gap' });

    const managerInput = UI._input(managerNameInit, 'Nome do Manager', (v) => (UI._state._tmpManager = v));
    UI._state._tmpManager = managerNameInit;

    const countryInput = UI._input(countryInit, 'País', (v) => (UI._state._tmpCountry = v));
    UI._state._tmpCountry = countryInit;

    const roleSelect = UI._select(
      [
        { value: 'coach', label: 'Treinador' },
        { value: 'sporting', label: 'Diretor Esportivo' },
        { value: 'president', label: 'Presidente' }
      ],
      roleInit,
      (v) => (UI._state._tmpRole = v)
    );
    UI._state._tmpRole = roleInit;

    const clubSelect = UI._select(
      clubs.map(c => ({
        value: c.id,
        label: `${c.name} (Série ${c.league})`
      })),
      clubInit,
      (v) => (UI._state._tmpClub = v)
    );
    UI._state._tmpClub = clubInit;

    body.appendChild(UI._h('div', { class: 'field' }, [UI._h('div', { class: 'label', html: 'Nome do Manager' }), managerInput]));
    body.appendChild(UI._h('div', { class: 'field' }, [UI._h('div', { class: 'label', html: 'País' }), countryInput]));
    body.appendChild(UI._h('div', { class: 'field' }, [UI._h('div', { class: 'label', html: 'Cargo' }), roleSelect]));
    body.appendChild(UI._h('div', { class: 'field' }, [UI._h('div', { class: 'label', html: 'Clube' }), clubSelect]));

    const footer = UI._h('div', { class: 'row' }, [
      UI._btn('VOLTAR', 'ghost', () => UI.go('saves')),
      UI._btn('CONTINUAR', 'primary', () => {
        const managerName = (UI._state._tmpManager || '').trim();
        const country = (UI._state._tmpCountry || '').trim();
        const role = UI._state._tmpRole || 'coach';
        const clubId = UI._state._tmpClub;

        if (!managerName) return alert('Informe o nome do manager.');
        if (!clubId) return alert('Escolha um clube.');

        const club = clubs.find(c => c.id === clubId);

        const saveObj = {
          version: 1,
          createdAt: Date.now(),
          packId,
          slot,
          managerName,
          country,
          role,
          clubId,
          clubName: club ? club.name : clubId,
          clubCrest: club ? club.crest : ''
        };

        UI._state.saves[slot - 1] = saveObj;
        UI._saveSaves();

        UI._state.currentSave = saveObj;
        UI.go('lobby');
      })
    ]);

    UI._setApp(UI._card('Criar Carreira', `Slot: ${slot} | Pack: ${packId}`, body, footer));
  };

  UI._getClubsFromPack = (pack) => {
    const clubs = Array.isArray(pack?.clubs) ? pack.clubs : [];
    return clubs
      .filter(c => c && c.id && c.name)
      .map(c => ({
        id: String(c.id),
        name: String(c.name),
        shortName: c.shortName ? String(c.shortName) : String(c.name),
        league: c.league ? String(c.league) : 'unknown',
        state: c.state ? String(c.state) : '',
        rating: typeof c.rating === 'number' ? c.rating : null,
        budget: typeof c.budget === 'number' ? c.budget : null,
        crest: c.crest ? String(c.crest) : `assets/crests/${String(c.id)}.png`
      }));
  };

  UI._renderLobby = () => {
    const save = UI._state.currentSave || UI._state.saves[(UI._state.saveSlot || 1) - 1];
    if (!save) return UI._renderError('Save não encontrado.');

    const crest = save.clubCrest || '';

    const top = UI._h('div', { class: 'lobby-top' }, [
      UI._h('div', { class: 'text dim', html: `Você assumiu: ${save.clubName}` })
    ]);

    const welcome = UI._h('div', { class: 'welcome' }, [
      crest ? UI._h('img', { class: 'crest', src: crest, alt: save.clubName }) : null,
      UI._h('div', { class: 'welcome-text' }, [
        UI._h('div', { class: 'welcome-title', html: `Bem-vindo, ${save.managerName}!` }),
        UI._h('div', { class: 'welcome-sub', html: `Cargo: ${save.role} | Clube: ${save.clubName}` })
      ])
    ]);

    const tips = UI._h('div', { class: 'box' }, [
      UI._h('div', { class: 'text', html: 'Use o Lobby para gestão completa (elenco, treinos, notícias e calendário).' })
    ]);

    const note = UI._h('div', { class: 'box' }, [
      UI._h('div', { class: 'text dim', html: 'Em fases seguintes: engine de partidas, desempenho, demissão, evoluções e mundo completo.' })
    ]);

    const footer = UI._h('div', { class: 'row' }, [
      UI._btn('VOLTAR', 'ghost', () => UI.go('home')),
      UI._btn('CALENDÁRIO (Fase 4)', 'primary', () => alert('Fase 4: calendário completo entra na próxima etapa.'))
    ]);

    UI._setApp(UI._card('Lobby', '', UI._h('div', { class: 'col gap' }, [top, welcome, tips, note]), footer));
  };

  UI._renderError = (msg) => {
    const body = UI._h('div', {}, [
      UI._h('div', { class: 'text', html: msg || 'Erro desconhecido.' })
    ]);
    const footer = UI._h('div', { class: 'row' }, [
      UI._btn('Recarregar', 'ghost', () => location.reload())
    ]);
    UI._setApp(UI._card('Erro crítico', '', body, footer));
  };

  // ============================
  // ✅ EXPORT GLOBAL (CORRIGIDO)
  // ============================

  // Compat: mantém window.UI
  window.UI = UI;

  // ✅ Correção real: registra no namespace do engine
  window.VFM26 = window.VFM26 || {};
  window.VFM26.UI = UI;
})();