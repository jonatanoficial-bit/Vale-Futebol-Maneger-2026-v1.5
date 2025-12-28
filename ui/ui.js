(() => {
  "use strict";

  const $app = () => document.getElementById("app");

  function esc(s){ return String(s ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;"); }

  function setHTML(html){
    $app().innerHTML = html;
  }

  function btn(id, label, cls){
    return `<button id="${id}" class="btn ${cls || ""}">${esc(label)}</button>`;
  }

  function teamLogoPath(teamId){
    return `assets/logos/${teamId}.png`;
  }

  function cover(){
    return `
      <div class="cover">
        <img src="assets/geral/capa.png" alt="Capa" />
        <div class="coverUI">
          <div class="coverTitle">Vale Futebol Manager 2026</div>
          <div class="coverSub">Base sólida (rebuild). Mantém seus escudos, faces e fundos.</div>
          <div class="row">
            ${btn("goPack","INICIAR","btnGreen btnFull")}
          </div>
        </div>
      </div>
    `;
  }

  async function renderPack(state){
    setHTML(`
      <div class="screen">
        <div class="max">
          <div class="topbar">
            <div class="brand"><h1>Pacote de Dados (DLC)</h1></div>
            <div class="chip">v2 rebuild</div>
          </div>

          <div class="panel">
            <div class="title">Escolha um Pacote</div>
            <div class="note">Você poderá atualizar elencos/competições trocando apenas os arquivos em <b>/packs</b> — sem mexer no código.</div>
            <div id="packList" class="grid" style="margin-top:12px;"></div>
            <div class="row" style="margin-top:14px;">
              ${btn("backCover","VOLTAR","btnDark btnFull")}
            </div>
          </div>
        </div>
      </div>
    `);

    try{
      const manifest = await window.DataPacks.loadManifest();
      const list = document.getElementById("packList");

      manifest.packs.forEach(p => {
        const card = document.createElement("div");
        card.className = "teamCard";
        card.innerHTML = `
          <div class="teamTop">
            <div class="teamNameMini">${esc(p.name)}</div>
          </div>
          <div class="teamName">${esc(p.id)}</div>
          <div class="teamMeta">Versão: ${esc(p.version || "1.0")}</div>
        `;
        card.addEventListener("click", async () => {
          try{
            window.Game.setScreen("loading");
            const loaded = await window.DataPacks.loadPack(p.id);
            window.Game.choosePack(loaded.meta, loaded.data);
          }catch(e){
            window.Game.setError("Falha ao carregar pack: " + (e?.message || e));
            window.Game.setScreen("pack");
          }
        });
        list.appendChild(card);
      });

      document.getElementById("backCover").onclick = () => window.Game.setScreen("cover");
    }catch(e){
      window.Game.setError("Não consegui carregar manifest.json: " + (e?.message || e));
      window.Game.setScreen("cover");
    }
  }

  function renderLoading(){
    setHTML(`
      <div class="screen">
        <div class="max">
          <div class="panel">
            <div class="title">Carregando…</div>
            <div class="note">Aguarde.</div>
          </div>
        </div>
      </div>
    `);
  }

  function renderSlots(state){
    const slots = window.SaveSlots.listSlots();
    setHTML(`
      <div class="screen">
        <div class="max">
          <div class="topbar">
            <div class="brand"><h1>Slots de Carreira</h1></div>
            <div class="chip">${esc(state.selection.pack?.name || "")}</div>
          </div>

          <div class="panel">
            <div class="title">Escolha um Slot</div>
            <div class="grid" style="margin-top:12px;">
              ${slots.map((s, i) => `
                <div class="teamCard" id="slot_${i}">
                  <div class="teamName">Slot ${i+1}</div>
                  <div class="teamMeta">${s.exists ? "Carreira existente" : "Vazio"}</div>
                  <div class="teamMeta">${s.exists && s.updatedAt ? ("Atualizado: " + esc(s.updatedAt)) : ""}</div>
                  <div class="row" style="margin-top:10px;">
                    ${s.exists ? `<button class="btn btnDanger btnFull" id="del_${i}">APAGAR</button>` : ""}
                  </div>
                </div>
              `).join("")}
            </div>

            <div class="row" style="margin-top:14px;">
              ${btn("backPack","VOLTAR","btnDark btnFull")}
            </div>
          </div>
        </div>
      </div>
    `);

    document.getElementById("backPack").onclick = () => window.Game.setScreen("pack");

    slots.forEach((s, i) => {
      document.getElementById(`slot_${i}`).addEventListener("click", (ev) => {
        // se clicou no botão apagar, não seleciona slot
        if ((ev.target && ev.target.id) && ev.target.id.startsWith("del_")) return;
        window.Game.chooseSlot(i);
      });

      if (s.exists) {
        document.getElementById(`del_${i}`).onclick = () => {
          if (confirm(`Apagar Slot ${i+1}?`)) {
            window.SaveSlots.clearSlot(i);
            window.Game.setScreen("slots");
          }
        };
      }
    });
  }

  function renderCareer(state){
    setHTML(`
      <div class="screen">
        <div class="max">
          <div class="topbar">
            <div class="brand"><h1>Criar Carreira</h1></div>
            <div class="chip">Slot ${((state.selection.slotIndex ?? 0)+1)}</div>
          </div>

          <div class="panel">
            <div class="title">Seu Perfil</div>
            <div class="note">Escolha avatar, nome e país.</div>

            <div class="field">
              <div class="label">Avatar (1–6)</div>
              <select id="avatar" class="select">
                <option value="1">Avatar 1</option>
                <option value="2">Avatar 2</option>
                <option value="3">Avatar 3</option>
                <option value="4">Avatar 4</option>
                <option value="5">Avatar 5</option>
                <option value="6">Avatar 6</option>
              </select>
            </div>

            <div class="field">
              <div class="label">Nome</div>
              <input id="name" class="input" placeholder="Seu nome" maxlength="24" />
            </div>

            <div class="field">
              <div class="label">País</div>
              <select id="country" class="select">
                <option>Brasil</option>
                <option>Argentina</option>
                <option>Uruguai</option>
                <option>Chile</option>
                <option>Portugal</option>
                <option>Espanha</option>
                <option>Inglaterra</option>
                <option>Itália</option>
                <option>Alemanha</option>
                <option>França</option>
              </select>
            </div>

            <div class="row" style="margin-top:14px;">
              ${btn("goRole","CONTINUAR","btnGreen btnFull")}
              ${btn("backSlots","VOLTAR","btnDark btnFull")}
            </div>
          </div>
        </div>
      </div>
    `);

    document.getElementById("backSlots").onclick = () => window.Game.setScreen("slots");
    document.getElementById("goRole").onclick = () => {
      const avatarId = document.getElementById("avatar").value;
      const name = document.getElementById("name").value.trim();
      const country = document.getElementById("country").value;

      if (!name) {
        alert("Digite seu nome.");
        return;
      }
      window.Game.setCareerInfo({ avatarId, name, country });
    };
  }

  function renderRole(state){
    setHTML(`
      <div class="screen">
        <div class="max">
          <div class="topbar">
            <div class="brand"><h1>Escolha seu Cargo</h1></div>
            <div class="chip">${esc(state.selection.career.name)}</div>
          </div>

          <div class="panel">
            <div class="title">Cargo</div>
            <div class="grid" style="margin-top:12px;">
              <div class="teamCard" id="role_coach">
                <div class="teamName">Treinador</div>
                <div class="teamMeta">Treinos, escalação, tática, rival, agenda, notícias.</div>
              </div>
              <div class="teamCard" id="role_director">
                <div class="teamName">Diretor Esportivo</div>
                <div class="teamMeta">Contratações, técnico/comissão, scouting, planejamento.</div>
              </div>
              <div class="teamCard" id="role_president">
                <div class="teamName">Presidente</div>
                <div class="teamMeta">Gestão total: estádio/CT, finanças, diretrizes e metas.</div>
              </div>
            </div>

            <div class="row" style="margin-top:14px;">
              ${btn("backCareer","VOLTAR","btnDark btnFull")}
            </div>
          </div>
        </div>
      </div>
    `);

    document.getElementById("backCareer").onclick = () => window.Game.setScreen("career");
    document.getElementById("role_coach").onclick = () => window.Game.setRole("coach");
    document.getElementById("role_director").onclick = () => window.Game.setRole("director");
    document.getElementById("role_president").onclick = () => window.Game.setRole("president");
  }

  function renderClub(state){
    const teams = state.data.teams || [];
    setHTML(`
      <div class="screen">
        <div class="max">
          <div class="topbar">
            <div class="brand"><h1>Escolha um Clube</h1></div>
            <div class="chip">${esc(state.selection.pack?.name || "")}</div>
          </div>

          <div class="panel">
            <div class="title">Clubes Disponíveis</div>
            <div class="note">Inicial: Série A e B (Brasil). Depois adicionaremos mundo todo + seleções via DLC.</div>
            <div id="clubs" class="grid" style="margin-top:12px;"></div>

            <div class="row" style="margin-top:14px;">
              ${btn("backRole","VOLTAR","btnDark btnFull")}
            </div>
          </div>
        </div>
      </div>
    `);

    const clubsEl = document.getElementById("clubs");
    teams.forEach(t => {
      const id = t.id;
      const name = t.name;
      const league = t.league || "";

      const card = document.createElement("div");
      card.className = "teamCard";
      card.innerHTML = `
        <div class="teamTop">
          <img class="teamLogo" src="${teamLogoPath(id)}" alt="${esc(name)}" onerror="this.style.display='none'"/>
          <div class="teamNameMini">${esc(league)}</div>
        </div>
        <div class="teamName">${esc(name)}</div>
        <div class="teamMeta">ID: ${esc(id)}</div>
      `;
      card.onclick = () => window.Game.setClub(id);
      clubsEl.appendChild(card);
    });

    document.getElementById("backRole").onclick = () => window.Game.setScreen("role");
  }

  function renderTutorial(state){
    const team = window.Game.getSelectedTeam();
    const role = state.selection.career.role;
    const roleName =
      role === "coach" ? "Treinador" :
      role === "director" ? "Diretor Esportivo" :
      role === "president" ? "Presidente" : "Gestor";

    setHTML(`
      <div class="screen">
        <div class="max">
          <div class="panel">
            <div class="title">Bem-vindo!</div>
            <div class="note">
              Olá, <b>${esc(state.selection.career.name)}</b>!<br/>
              Sou o funcionário do clube e vou te apresentar o sistema.<br/><br/>
              Você assumirá como <b>${esc(roleName)}</b> do <b>${esc(team?.name || "Clube")}</b>.<br/>
              No lobby, você terá acesso aos módulos de gestão conforme seu cargo.
            </div>

            <div class="row" style="margin-top:14px;">
              ${btn("finishTut","ENTRAR NO LOBBY","btnGreen btnFull")}
            </div>
          </div>
        </div>
      </div>
    `);

    document.getElementById("finishTut").onclick = () => window.Game.finishTutorial();
  }

  function renderLobby(state){
    const team = window.Game.getSelectedTeam();
    const role = state.selection.career.role;

    const roleLabel =
      role === "coach" ? "Treinador" :
      role === "director" ? "Diretor Esportivo" :
      role === "president" ? "Presidente" : "—";

    setHTML(`
      <div class="screen">
        <div class="max">
          <div class="topbar">
            <div class="brand">
              <h1>Lobby</h1>
            </div>
            <div class="chip">Slot ${((state.selection.slotIndex ?? 0)+1)} • ${esc(roleLabel)}</div>
          </div>

          <div class="panel">
            <div class="lobbyHead">
              ${team?.id ? `<img class="lobbyLogo" src="${teamLogoPath(team.id)}" alt="" onerror="this.style.display='none'"/>` : ""}
              <div>
                <p class="lobbyTitle">${esc(team?.name || "Sem clube")}</p>
                <p class="lobbySub">${esc(state.selection.career.name)} • ${esc(state.selection.career.country)}</p>
              </div>
            </div>

            <div class="menu">
              ${btn("goSquad","ELENCO","btnBlue btnFull")}
              ${btn("goMarket","MERCADO","btnBlue btnFull")}
              ${btn("goCalendar","CALENDÁRIO","btnBlue btnFull")}
              ${btn("goTactics","TÁTICAS","btnGold btnFull")}
              ${btn("save","SALVAR","btnGreen btnFull")}
              ${btn("backStart","SAIR PARA CAPA","btnDark btnFull")}
            </div>

            <div class="note" style="margin-top:12px;">
              Próxima etapa: módulos completos por cargo + campeonatos (A/B, Copa do Brasil, Estaduais) + treinos influenciando resultados.
            </div>
          </div>

          <div id="module" style="margin-top:14px;"></div>
        </div>
      </div>
    `);

    document.getElementById("save").onclick = () => { window.Game.saveNow(); alert("Salvo."); };
    document.getElementById("backStart").onclick = () => window.Game.setScreen("cover");

    document.getElementById("goSquad").onclick = () => renderModuleSquad(state);
    document.getElementById("goMarket").onclick = () => renderModuleMarket(state);
    document.getElementById("goCalendar").onclick = () => renderModuleCalendar(state);
    document.getElementById("goTactics").onclick = () => renderModuleTactics(state);
  }

  function renderModuleWrap(title, innerHtml){
    const el = document.getElementById("module");
    el.innerHTML = `
      <div class="panel">
        <div class="title">${esc(title)}</div>
        ${innerHtml}
        <div class="row" style="margin-top:14px;">
          ${btn("closeModule","FECHAR","btnDark btnFull")}
        </div>
      </div>
    `;
    document.getElementById("closeModule").onclick = () => { el.innerHTML = ""; };
  }

  function renderModuleSquad(state){
    const squad = window.Game.getSquad() || [];
    const rows = squad.slice(0, 60).map(p => {
      const name = p.name || "Jogador";
      const pos = p.pos || p.position || "POS";
      const ovr = (p.ovr ?? p.overall ?? 70);
      const face = p.face || "";
      return `
        <div class="playerRow">
          <img class="playerFace" src="${esc(face)}" alt="" onerror="this.style.display='none'"/>
          <div>
            <div class="pName">${esc(name)}</div>
            <div class="pMeta">${esc(pos)}</div>
          </div>
          <div class="pOvr">${esc(String(ovr))}</div>
        </div>
      `;
    }).join("");

    renderModuleWrap("Elenco", `
      <div class="note">Nesta fase, o elenco vem do pack (playersByTeamId). Depois ligamos treino/moral/lesões.</div>
      <div class="playerList" style="margin-top:12px;">
        ${rows || `<div class="note">Sem jogadores no pack para este clube (ok nesta fase).</div>`}
      </div>
    `);
  }

  function renderModuleMarket(state){
    const role = state.selection.career.role;
    const locked = (role === "coach") ? "" : ""; // depois vamos limitar por cargo
    renderModuleWrap("Mercado", `
      <div class="note">Placeholder funcional (próxima fase: salário x limite de folha + FFP + negociação).</div>
      <div class="field">
        <div class="label">Posição</div>
        <select class="select"><option>Todos</option><option>GOL</option><option>ZAG</option><option>LAT</option><option>MEI</option><option>ATA</option></select>
      </div>
      <div class="field">
        <div class="label">Mín OVR</div>
        <input class="input" type="number" value="70" min="40" max="99" />
      </div>
      ${locked}
    `);
  }

  function renderModuleCalendar(state){
    renderModuleWrap("Calendário", `
      <div class="note">Próxima fase: calendário anual real com Estaduais + Série A/B + Copa do Brasil.</div>
      <div class="list" style="margin-top:12px;">
        <div class="list-row"><div class="pill">JAN</div><div class="list-text">Estaduais (início) + pré-temporada</div></div>
        <div class="list-row"><div class="pill">ABR</div><div class="list-text">Série A/B (rodadas iniciais)</div></div>
        <div class="list-row"><div class="pill">JUN</div><div class="list-text">Copa do Brasil (fases)</div></div>
        <div class="list-row"><div class="pill">DEZ</div><div class="list-text">Final da temporada</div></div>
      </div>
    `);
  }

  function renderModuleTactics(state){
    renderModuleWrap("Táticas", `
      <div class="note">Próxima fase: escalação 11x11 com posições + impacto na simulação.</div>
      <div class="field">
        <div class="label">Formação</div>
        <select class="select"><option>4-3-3</option><option>4-4-2</option><option>3-5-2</option></select>
      </div>
      <div class="field">
        <div class="label">Mentalidade</div>
        <select class="select"><option>Equilibrado</option><option>Ofensivo</option><option>Defensivo</option></select>
      </div>
      <div style="height:260px;border-radius:16px;border:3px solid var(--gold);background:#0b6a2a;margin-top:12px;"></div>
    `);
  }

  const UI = {
    render(state){
      const screen = state.flow.screen;

      if (screen === "cover") {
        setHTML(cover());
        document.getElementById("goPack").onclick = () => window.Game.setScreen("pack");
        return;
      }

      if (screen === "loading") return renderLoading();

      if (screen === "pack") return renderPack(state);
      if (screen === "slots") return renderSlots(state);
      if (screen === "career") return renderCareer(state);
      if (screen === "role") return renderRole(state);
      if (screen === "club") return renderClub(state);
      if (screen === "tutorial") return renderTutorial(state);
      if (screen === "lobby") return renderLobby(state);

      // fallback seguro
      window.Game.setScreen("cover");
    }
  };

  window.UI = UI;
})();