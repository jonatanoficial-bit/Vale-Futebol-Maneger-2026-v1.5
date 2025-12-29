/* ui/career-ui.js — Criação de carreira (Fase 3) */
(function () {
  'use strict';

  const NS = (window.VFM26 = window.VFM26 || {});
  const BootCheck = NS.BootCheck;

  const CareerUI = {
    register(UI) {
      UI.register('career', () => {
        const countries = NS.Game.getCountriesForCareer();
        const avatars = NS.Game.getAvatars();
        const roles = NS.Game.getRoles();

        return `
          <div class="screen">
            <div class="topbar">
              <div class="brand">
                <div class="title">Criar Carreira</div>
                <div class="subtitle">Crie seu perfil, escolha o cargo e selecione um clube do DataPack.</div>
              </div>
              <div class="pill"><span class="dot"></span><span>Fase 3</span></div>
            </div>

            <div class="stack">

              <div class="card">
                <h2>1) Perfil do Manager</h2>
                <div class="grid grid-2" style="margin-top:12px;">
                  <div class="field">
                    <div class="label">Nome</div>
                    <input id="firstName" placeholder="Ex: Jonatan" maxlength="18" />
                  </div>
                  <div class="field">
                    <div class="label">Sobrenome</div>
                    <input id="lastName" placeholder="Ex: Vale" maxlength="18" />
                  </div>
                  <div class="field">
                    <div class="label">País</div>
                    <select id="country">
                      ${countries.map(c => `<option value="${c.id}" ${c.id==='BR'?'selected':''}>${c.name}</option>`).join('')}
                    </select>
                  </div>
                  <div class="field">
                    <div class="label">Avatar</div>
                    <select id="avatar">
                      ${avatars.map(a => `<option value="${a.id}">${a.label}</option>`).join('')}
                    </select>
                  </div>
                </div>
                <div class="toast" style="margin-top:12px;">
                  Dica: avatares aqui são IDs (sem mexer em <span class="mono">/assets</span>). Depois podemos plugar faces reais do seu pacote.
                </div>
              </div>

              <div class="card">
                <h2>2) Escolher Cargo</h2>
                <div class="seg" id="roleSeg" style="margin-top:12px;">
                  ${roles.map(r => `<button type="button" data-role="${r.id}">${r.name}</button>`).join('')}
                </div>
                <div class="toast" id="roleDesc" style="margin-top:12px;">Selecione um cargo para ver a descrição.</div>
              </div>

              <div class="card">
                <h2>3) Escolher Clube (Brasil)</h2>
                <p>Os clubes vêm do DataPack atual. Pronto para expansão mundial: basta adicionar novos JSON em <span class="mono">/packs</span>.</p>
                <div class="field" style="margin-top:12px;">
                  <div class="label">Filtrar</div>
                  <input id="clubFilter" placeholder="Digite para buscar clube..." />
                </div>
                <div class="list" id="clubList" style="margin-top:12px;"></div>
              </div>

              <div id="formError" class="toast" style="display:none;border-color:rgba(255,59,59,.5)"></div>

            </div>

            <div class="actions">
              <button class="btn btn-secondary" id="btnBack">Voltar</button>
              <button class="btn btn-primary" id="btnCreate">Criar Carreira</button>
            </div>
          </div>
        `;
      });

      UI.screens.career.afterRender = () => {
        const roles = NS.Game.getRoles();
        const clubs = NS.Game.getClubsFromPack();
        let selectedRole = null;
        let selectedClub = null;

        const roleSeg = document.getElementById('roleSeg');
        const roleDesc = document.getElementById('roleDesc');
        const clubList = document.getElementById('clubList');
        const clubFilter = document.getElementById('clubFilter');
        const formError = document.getElementById('formError');

        function showError(msg) {
          formError.style.display = 'block';
          formError.textContent = msg;
        }
        function clearError() {
          formError.style.display = 'none';
          formError.textContent = '';
        }

        function renderClubs(filter) {
          const f = (filter || '').toLowerCase().trim();
          const list = clubs
            .filter(c => !f || c.name.toLowerCase().includes(f) || (c.state || '').toLowerCase().includes(f))
            .slice(0, 40);

          if (list.length === 0) {
            clubList.innerHTML = `<div class="toast">Nenhum clube encontrado.</div>`;
            return;
          }

          clubList.innerHTML = list.map(c => `
            <div class="list-item ${selectedClub === c.id ? 'err' : ''}" data-club="${c.id}">
              <div>
                <strong>${c.name}</strong>
                <small>${c.league === 'A' ? 'Série A' : c.league === 'B' ? 'Série B' : 'Liga'} ${c.state ? '• ' + c.state : ''}</small>
              </div>
              <span class="badge">${typeof c.rating === 'number' ? c.rating : '—'}</span>
            </div>
          `).join('');

          clubList.querySelectorAll('[data-club]').forEach(el => {
            el.onclick = () => {
              selectedClub = el.getAttribute('data-club');
              clearError();
              renderClubs(clubFilter.value);
              // marca visualmente selecionado
              clubList.querySelectorAll('.list-item').forEach(x => x.style.outline = 'none');
              el.style.outline = '2px solid rgba(0,255,132,.55)';
              el.style.boxShadow = '0 0 0 3px rgba(0,255,132,.10)';
            };
          });
        }

        // roles
        roleSeg.querySelectorAll('button[data-role]').forEach(btn => {
          btn.onclick = () => {
            const id = btn.getAttribute('data-role');
            selectedRole = id;

            roleSeg.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const r = roles.find(x => x.id === id);
            roleDesc.textContent = r ? r.desc : '—';
            clearError();
          };
        });

        // default: Treinador
        const defaultBtn = roleSeg.querySelector('button[data-role="coach"]') || roleSeg.querySelector('button[data-role]');
        if (defaultBtn) defaultBtn.click();

        // clubs
        renderClubs('');

        clubFilter.oninput = () => renderClubs(clubFilter.value);

        // back
        document.getElementById('btnBack').onclick = () => {
          NS.UI.go('saveslot');
        };

        // create
        document.getElementById('btnCreate').onclick = () => {
          clearError();

          const firstName = document.getElementById('firstName').value;
          const lastName = document.getElementById('lastName').value;
          const countryId = document.getElementById('country').value;
          const avatarId = document.getElementById('avatar').value;
          const roleId = selectedRole;
          const clubId = selectedClub;

          const draft = NS.Game.createCareerDraft({ firstName, lastName, countryId, avatarId, roleId, clubId });
          if (!draft.ok) {
            showError('Ajuste os dados para continuar: ' + draft.error);
            return;
          }

          const ok = NS.Game.commitCareerToSlot(draft.career);
          if (!ok) return;

          // Tutorial de boas-vindas (uma vez)
          if (NS.Game.shouldShowTutorial()) NS.UI.go('tutorial');
          else NS.UI.go('lobby');
        };
      };

      // Tutorial
      UI.register('tutorial', () => {
        const c = NS.Game.state.career;
        const roleId = c?.role?.id;

        let title = 'Bem-vindo.';
        let body = 'Sua carreira começa agora. Decisões importam.';
        if (roleId === 'coach') {
          title = 'Bem-vindo, Treinador.';
          body = 'Você controla escalação, treinos e táticas. Resultados afetam moral, reputação e segurança no cargo.';
        } else if (roleId === 'sporting') {
          title = 'Bem-vindo, Diretor Esportivo.';
          body = 'Você lidera contratações, estrutura do futebol e planejamento. Monta o projeto e sustenta a competitividade.';
        } else if (roleId === 'president') {
          title = 'Bem-vindo, Presidente.';
          body = 'Você decide o rumo total do clube: orçamento, infraestrutura, diretrizes e poder máximo. Mas a cobrança é maior.';
        }

        const club = c?.club?.name || 'seu clube';
        const name = `${c?.manager?.firstName || ''} ${c?.manager?.lastName || ''}`.trim();

        return `
          <div class="screen">
            <div class="topbar">
              <div class="brand">
                <div class="title">Tutorial de Boas-Vindas</div>
                <div class="subtitle">${club} • ${name}</div>
              </div>
              <div class="pill"><span class="dot"></span><span>Entrada</span></div>
            </div>

            <div class="card">
              <h2>${title}</h2>
              <p style="margin-top:8px;">${body}</p>
              <div class="toast" style="margin-top:12px;">
                Próximo passo: Lobby. Depois vamos ativar calendário real brasileiro, elenco, staff, mercado e simulação.
              </div>
            </div>

            <div class="actions">
              <button class="btn btn-primary" id="btnOk">OK</button>
            </div>
          </div>
        `;
      });

      UI.screens.tutorial.afterRender = () => {
        document.getElementById('btnOk').onclick = () => {
          NS.Game.markTutorialShown();
          NS.UI.go('lobby');
        };
      };
    }
  };

  NS.CareerUI = CareerUI;
})();