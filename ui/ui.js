/* ui/ui.js — UI principal (router simples, sem frameworks) */
(function () {
  'use strict';

  const NS = (window.VFM26 = window.VFM26 || {});
  const BootCheck = NS.BootCheck;

  const UI = {
    root: null,
    screens: {},

    init(rootEl) {
      BootCheck && BootCheck.step('UI_INIT_START');
      this.root = rootEl;
      this.registerCoreScreens();
      BootCheck && BootCheck.step('UI_INIT_OK');
    },

    register(name, renderFn) {
      this.screens[name] = renderFn;
    },

    go(name, params) {
      const fn = this.screens[name];
      if (!fn) {
        return BootCheck.fatal('UI_E01_SCREEN_NOT_FOUND', `Tela não registrada: ${name}`);
      }
      try {
        const html = fn(params || {});
        this.root.innerHTML = html;
        this._wire(name, params || {});
      } catch (e) {
        BootCheck.fatal('UI_E99_RENDER_FAIL', `Falha ao renderizar tela: ${name}`, String(e && e.stack ? e.stack : e));
      }
    },

    _wire(name, params) {
      // chama hook opcional
      const hook = this.screens[name]?.afterRender;
      if (typeof hook === 'function') {
        try { hook(params); } catch (e) {
          BootCheck.fatal('UI_E98_WIRE_FAIL', `Falha ao ativar eventos da tela: ${name}`, String(e));
        }
      }
    },

    // ---------- Telas da Fase 1/2/3 ----------
    registerCoreScreens() {
      // Cover
      this.register('cover', () => {
        const engineV = NS.Engine?.version || '?.?.?';
        const gameV = NS.Game?.state?.version || '?.?.?';
        return `
          <div class="screen">
            <div class="topbar">
              <div class="brand">
                <div class="title">VALE FUTEBOL MANAGER 2026</div>
                <div class="subtitle">Simulador de futebol manager. Base sólida pronta. Agora: DataPack, Saves e Carreira.</div>
              </div>
              <div class="pill"><span class="dot"></span><span>Engine ${engineV} • Game ${gameV}</span></div>
            </div>

            <div class="hero">
              <h1>Modo Carreira</h1>
              <p>Fluxo obrigatório: <b>DataPack → Save Slot → Carreira</b>. Sem build, sem frameworks, tudo editável no celular.</p>
            </div>

            <div class="card">
              <h2>Pronto para começar</h2>
              <p>Escolha o pacote de dados (Brasil), selecione o slot e crie sua carreira com cargo e clube. A expansão mundial será via novos JSON em <span class="mono">/packs</span>.</p>
            </div>

            <div class="actions">
              <button class="btn btn-primary" id="btnStart">Iniciar</button>
            </div>
          </div>
        `;
      });
      this.screens.cover.afterRender = () => {
        document.getElementById('btnStart').onclick = () => this.go('datapack');
      };

      // DataPack (Fase 2)
      this.register('datapack', () => {
        return `
          <div class="screen">
            <div class="topbar">
              <div class="brand">
                <div class="title">Escolher DataPack</div>
                <div class="subtitle">Sem mexer no código do jogo: os packs são arquivos JSON em <span class="mono">/packs</span>.</div>
              </div>
              <div class="pill"><span class="dot"></span><span>Fase 2</span></div>
            </div>

            <div class="stack" id="packList">
              <div class="toast">Carregando packs...</div>
            </div>

            <div class="actions">
              <button class="btn btn-secondary" id="btnBack">Voltar</button>
            </div>
          </div>
        `;
      });
      this.screens.datapack.afterRender = async () => {
        document.getElementById('btnBack').onclick = () => this.go('cover');

        const listEl = document.getElementById('packList');
        try {
          const packs = await NS.Game.listPacks();
          listEl.innerHTML = packs.map(p => `
            <div class="card">
              <h2>${p.name}</h2>
              <p><b>ID:</b> ${p.id}  •  <b>Região:</b> ${p.region}<br>${p.description}</p>
              <div style="margin-top:12px;">
                <button class="btn btn-primary btn-wide" data-pack="${p.id}">Selecionar</button>
              </div>
            </div>
          `).join('');

          listEl.querySelectorAll('button[data-pack]').forEach(btn => {
            btn.onclick = async () => {
              const id = btn.getAttribute('data-pack');
              btn.disabled = true;
              btn.textContent = 'Carregando...';
              try {
                await NS.Game.loadPack(id);
                this.go('saveslot');
              } catch (e) {
                BootCheck.fatal('PACK_E01_LOAD_FAIL', 'Falha ao carregar o DataPack.', String(e));
              } finally {
                btn.disabled = false;
                btn.textContent = 'Selecionar';
              }
            };
          });
        } catch (e) {
          BootCheck.fatal('PACK_E00_LIST_FAIL', 'Falha ao listar DataPacks.', String(e));
        }
      };

      // SaveSlots (Fase 2)
      this.register('saveslot', () => {
        const pack = NS.Game.getPackSummary();
        return `
          <div class="screen">
            <div class="topbar">
              <div class="brand">
                <div class="title">Escolher Save Slot</div>
                <div class="subtitle">DataPack ativo: <b>${pack ? pack.name : '—'}</b> (ID: <span class="mono">${pack ? pack.id : '—'}</span>)</div>
              </div>
              <div class="pill"><span class="dot"></span><span>2 slots</span></div>
            </div>

            <div class="stack" id="slots"></div>

            <div class="actions">
              <button class="btn btn-secondary" id="btnBack">Voltar</button>
            </div>
          </div>
        `;
      });
      this.screens.saveslot.afterRender = () => {
        document.getElementById('btnBack').onclick = () => this.go('datapack');

        const slotsEl = document.getElementById('slots');
        const packId = NS.Game.state.packId;

        function renderSlot(slotNum) {
          const save = NS.Game.readSlot(slotNum);
          const hasCareer = !!save?.career;
          const title = hasCareer ? 'Continuar carreira' : 'Começar novo jogo';
          const sub = save
            ? `Pack: ${save.packId} • Atualizado: ${save.updatedAt ? save.updatedAt.slice(0,10) : '—'}`
            : `Slot vazio. Pack atual: ${packId}`;

          const badge = hasCareer ? 'CARREIRA' : 'VAZIO';

          return `
            <div class="list-item">
              <div>
                <strong>SLOT ${slotNum} — ${title}</strong>
                <small>${sub}</small>
                ${hasCareer ? `<small><b>Manager:</b> ${save.career.manager.firstName} ${save.career.manager.lastName} • <b>Clube:</b> ${save.career.club.name}</small>` : ``}
              </div>
              <div style="display:flex;flex-direction:column;gap:10px;align-items:flex-end;">
                <span class="badge">${badge}</span>
                <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;">
                  <button class="btn btn-primary" data-act="open" data-slot="${slotNum}">${hasCareer ? 'ABRIR' : 'CRIAR NOVO'}</button>
                  <button class="btn btn-danger" data-act="del" data-slot="${slotNum}">APAGAR</button>
                </div>
              </div>
            </div>
          `;
        }

        slotsEl.innerHTML = `
          <div class="list">
            ${renderSlot(1)}
            ${renderSlot(2)}
          </div>
        `;

        slotsEl.querySelectorAll('button[data-act]').forEach(btn => {
          btn.onclick = () => {
            const act = btn.getAttribute('data-act');
            const slot = Number(btn.getAttribute('data-slot'));

            if (act === 'del') {
              const ok = confirm(`Apagar SLOT ${slot}?`);
              if (!ok) return;
              NS.Game.deleteSlot(slot);
              this.go('saveslot');
              return;
            }

            if (act === 'open') {
              NS.Game.selectSlot(slot);
              const save = NS.Game.readSlot(slot);

              // Se já tem carreira, vai direto pro lobby (ou tutorial se preferir)
              if (save?.career) {
                NS.Game.state.career = save.career;
                if (NS.Game.shouldShowTutorial()) this.go('tutorial');
                else this.go('lobby');
                return;
              }

              // Novo jogo -> Fase 3
              this.go('career');
            }
          };
        });
      };

      // Fase 3: Carreira (registrada em arquivo separado, mas garantimos fallback)
      if (NS.CareerUI && typeof NS.CareerUI.register === 'function') {
        NS.CareerUI.register(this);
      }
      if (NS.LobbyUI && typeof NS.LobbyUI.register === 'function') {
        NS.LobbyUI.register(this);
      }
    }
  };

  NS.UI = UI;
})();