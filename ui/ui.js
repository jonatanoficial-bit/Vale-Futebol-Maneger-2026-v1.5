/* =======================================================
   VALE FUTEBOL MANAGER 2026
   ui/ui.js — UI principal (telas + lobby + calendário + match)
   -------------------------------------------------------
   Regras:
   - Sem remover fluxos já existentes
   - Adicionar telas novas sem quebrar as anteriores
   ======================================================= */

(function () {
  const root = document.getElementById("app");

  const uiState = {
    matchQuality: "MEDIO",
    lastMatchReport: null
  };

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function render() {
    const st = window.Game?.getState?.();
    if (!st) {
      root.innerHTML = `<div class="screen"><div class="card">Carregando...</div></div>`;
      return;
    }

    switch (st.screen) {
      case "cover":
        return renderCover(st);
      case "pack":
        return renderPack(st);
      case "slots":
        return renderSlots(st);
      case "career":
        return renderCareer(st);
      case "role":
        return renderRole(st);
      case "club":
        return renderClub(st);
      case "tutorial":
        return renderTutorial(st);
      case "lobby":
        return renderLobby(st);
      case "calendar":
        return renderCalendar(st);
      case "match":
        return renderMatch(st);
      case "postMatch":
        return renderPostMatch(st);
      default:
        root.innerHTML = `<div class="screen"><div class="card">Tela desconhecida: ${esc(st.screen)}</div></div>`;
        return;
    }
  }

  // -------------------------
  // COVER
  // -------------------------
  function renderCover(st) {
    root.innerHTML = `
      <div class="screen cover">
        <div class="cover-inner">
          <div class="card">
            <h1>Vale Futebol Manager 2026</h1>
            <p>Capa mantida (não alterar).</p>
            <button id="btn-start" class="btn primary">INICIAR</button>
          </div>
        </div>
      </div>
    `;
    document.getElementById("btn-start").onclick = () => {
      window.Game.setScreen("pack");
      render();
    };
  }

  // -------------------------
  // PACK
  // -------------------------
  function renderPack(st) {
    const packs = window.Game.listPacks();
    root.innerHTML = `
      <div class="screen">
        <div class="card">
          <h2>Escolha um pacote de dados</h2>
          <p>Pacotes são DLCs/atualizações sem mexer no código.</p>
          <div class="list">
            ${packs
              .map(
                p => `
              <button class="btn" data-pack="${esc(p.id)}">
                ${esc(p.name)} <span class="muted">(${esc(p.id)})</span>
              </button>`
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

    root.querySelectorAll("[data-pack]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-pack");
        window.Game.selectPack(id);
        window.Game.setScreen("slots");
        render();
      };
    });
  }

  // -------------------------
  // SLOTS
  // -------------------------
  function renderSlots(st) {
    const slots = window.Game.listSlots();
    root.innerHTML = `
      <div class="screen">
        <div class="card">
          <h2>Slots de Salvamento</h2>
          <p>Você pode manter duas carreiras.</p>

          <div class="list">
            ${slots
              .map(s => {
                const has = s.hasSave;
                return `
                  <div class="slot-row">
                    <button class="btn ${has ? "primary" : ""}" data-slot="${esc(s.id)}">
                      Slot ${esc(s.id)} ${has ? "• (carreira existente)" : "• (vazio)"}
                    </button>
                    ${
                      has
                        ? `<button class="btn" data-load="${esc(s.id)}">CARREGAR</button>`
                        : `<button class="btn" data-new="${esc(s.id)}">NOVO</button>`
                    }
                  </div>
                `;
              })
              .join("")}
          </div>

          <button id="btn-back" class="btn">Voltar</button>
        </div>
      </div>
    `;

    document.getElementById("btn-back").onclick = () => {
      window.Game.setScreen("pack");
      render();
    };

    root.querySelectorAll("[data-load]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-load");
        window.Game.loadSlot(id);
        window.Game.setScreen("lobby");
        render();
      };
    });

    root.querySelectorAll("[data-new]").forEach(btn => {
      btn.onclick = () => {
        const id = btn.getAttribute("data-new");
        window.Game.selectSlot(id);
        window.Game.setScreen("career");
        render();
      };
    });
  }

  // -------------------------
  // CAREER
  // -------------------------
  function renderCareer(st) {
    root.innerHTML = `
      <div class="screen">
        <div class="card">
          <h2>Criar Carreira</h2>

          <label>Avatar</label>
          <select id="avatar">
            ${[0, 1, 2, 3, 4, 5].map(a => `<option value="${a}">Avatar ${a}</option>`).join("")}
          </select>

          <label>Nome</label>
          <input id="name" placeholder="Seu nome" value="Jonatan Vale"/>

          <label>País</label>
          <input id="country" placeholder="País" value="Brasil"/>

          <button id="btn-next" class="btn primary">CONTINUAR</button>
          <button id="btn-back" class="btn">Voltar</button>
        </div>
      </div>
    `;

    document.getElementById("btn-back").onclick = () => {
      window.Game.setScreen("slots");
      render();
    };

    document.getElementById("btn-next").onclick = () => {
      window.Game.setTmpCareer({
        avatarId: Number(document.getElementById("avatar").value),
        name: document.getElementById("name").value,
        country: document.getElementById("country").value
      });
      window.Game.setScreen("role");
      render();
    };
  }

  // -------------------------
  // ROLE
  // -------------------------
  function renderRole(st) {
    root.innerHTML = `
      <div class="screen">
        <div class="card">
          <h2>Escolha seu cargo</h2>
          <button class="btn primary" data-role="TREINADOR">Treinador</button>
          <button class="btn primary" data-role="DIRETOR">Diretor Esportivo</button>
          <button class="btn primary" data-role="PRESIDENTE">Presidente</button>

          <button id="btn-back" class="btn">Voltar</button>
        </div>
      </div>
    `;

    document.getElementById("btn-back").onclick = () => {
      window.Game.setScreen("career");
      render();
    };

    root.querySelectorAll("[data-role]").forEach(btn => {
      btn.onclick = () => {
        window.Game.setTmpRole(btn.getAttribute("data-role"));
        window.Game.setScreen("club");
        render();
      };
    });
  }

  // -------------------------
  // CLUB
  // -------------------------
  function renderClub(st) {
    const clubs = window.Game.getClubs();
    root.innerHTML = `
      <div class="screen">
        <div class="card">
          <h2>Escolha um clube</h2>
          <div class="list">
            ${clubs
              .slice(0, 50)
              .map(
                c => `
              <button class="btn" data-club="${esc(c.id)}">
                ${esc(c.name)}
              </button>`
              )
              .join("")}
          </div>
          <button id="btn-back" class="btn">Voltar</button>
        </div>
      </div>
    `;

    document.getElementById("btn-back").onclick = () => {
      window.Game.setScreen("role");
      render();
    };

    root.querySelectorAll("[data-club]").forEach(btn => {
      btn.onclick = () => {
        window.Game.finishCareer(btn.getAttribute("data-club"));
        window.Game.setScreen("tutorial");
        render();
      };
    });
  }

  // -------------------------
  // TUTORIAL
  // -------------------------
  function renderTutorial(st) {
    const c = window.Game.getCareer();
    const club = window.Game.getClubById(c.clubId);
    root.innerHTML = `
      <div class="screen">
        <div class="card">
          <h2>Bem-vindo ao ${esc(club?.name || "Clube")}</h2>
          <p>Sou um funcionário do clube. Vou te guiar rapidamente.</p>
          <ul>
            <li>Use o Lobby para acessar Elenco, Calendário, Mercado, Táticas etc.</li>
            <li>O Próximo Jogo abre a Central da Partida.</li>
          </ul>
          <button id="btn-ok" class="btn primary">OK</button>
        </div>
      </div>
    `;
    document.getElementById("btn-ok").onclick = () => {
      window.Game.setScreen("lobby");
      render();
    };
  }

  // -------------------------
  // LOBBY
  // -------------------------
  function renderLobby(st) {
    const c = window.Game.getCareer();
    const club = window.Game.getClubById(c.clubId);

    const next = window.Game.getNextClubMatch();
    const nextLine = next
      ? `${esc(next.date)} • ${esc(next.competition)} • Rodada ${esc(next.matchDay)} • ${esc(next.fixture.homeId)} x ${esc(
          next.fixture.awayId
        )}`
      : "Sem próximo jogo.";

    root.innerHTML = `
      <div class="screen">
        <div class="card">
          <div class="row">
            <div class="club">
              <h3>Lobby</h3>
              <div class="muted">${esc(club?.name || "Clube")} • ${esc(c.profile?.name || "")} • ${esc(c.profile?.country || "")}</div>
            </div>
            <div class="pill">Slot ${esc(st.selectedSlot || "")} • ${esc(c.role || "")}</div>
          </div>

          <div class="card inner">
            <h3>PRÓXIMO JOGO</h3>
            <div class="muted">${nextLine}</div>
            <button id="btn-go-next-match" class="btn primary">IR PARA DATA DO PRÓXIMO JOGO</button>
          </div>

          <button id="btn-roster" class="btn">ELENCO</button>
          <button id="btn-calendar" class="btn">CALENDÁRIO (REAL)</button>
          <button id="btn-market" class="btn">MERCADO</button>
          <button id="btn-tactics" class="btn">TÁTICAS</button>

          <button id="btn-advance" class="btn">AVANÇAR DATA</button>
          <button id="btn-save" class="btn primary">SALVAR</button>
          <button id="btn-exit" class="btn">SAIR PARA CAPA</button>

          <div class="muted" style="margin-top:10px">
            Próximo passo (Entrega seguinte): Simular Partida e salvar resultado em tabela.
          </div>
        </div>
      </div>
    `;

    document.getElementById("btn-go-next-match").onclick = () => {
      const m = window.Game.openNextMatch();
      if (!m) return alert("Sem próximo jogo.");
      window.Game.setScreen("match");
      render();
    };

    document.getElementById("btn-calendar").onclick = () => {
      window.Game.setScreen("calendar");
      render();
    };

    document.getElementById("btn-save").onclick = () => {
      window.Game.save();
      alert("Salvo.");
    };

    document.getElementById("btn-exit").onclick = () => {
      window.Game.setScreen("cover");
      render();
    };

    // placeholders (não quebrar)
    document.getElementById("btn-roster").onclick = () => alert("Elenco: em breve (módulo).");
    document.getElementById("btn-market").onclick = () => alert("Mercado: em breve (módulo).");
    document.getElementById("btn-tactics").onclick = () => alert("Táticas: em breve (módulo).");

    document.getElementById("btn-advance").onclick = () => {
      // Avança para o próximo evento (bloco ou jogo)
      const moved = window.Game.advanceOneEvent();
      if (!moved) alert("Sem próximos eventos.");
      render();
    };
  }

  // -------------------------
  // CALENDAR
  // -------------------------
  function renderCalendar(st) {
    const c = window.Game.getCareer();
    const events = window.Game.getCalendarEvents();

    const next = window.Game.getNextClubMatch();
    const nextLine = next
      ? `${esc(next.date)} • ${esc(next.competition)} • Rodada ${esc(next.matchDay)} • ${esc(next.fixture.homeId)} x ${esc(
          next.fixture.awayId
        )}`
      : "Sem próximo jogo.";

    root.innerHTML = `
      <div class="screen">
        <div class="card">
          <h2>CALENDÁRIO ANUAL (REAL)</h2>
          <div class="muted">Data atual da carreira: ${esc(c.currentDate)}</div>
          <div class="muted">Próximo jogo: ${nextLine}</div>

          <button id="btn-advance-next-date" class="btn primary">AVANÇAR PARA PRÓXIMA DATA</button>
          <button id="btn-go-next-match" class="btn">IR PARA PRÓXIMO JOGO</button>

          <div class="list" style="margin-top:10px">
            ${events
              .map(e => {
                if (e.type === "block") {
                  return `
                    <div class="list-item">
                      <div class="title">${esc(e.date)} • ${esc(e.label)} • ${esc(e.phase)}</div>
                      <div class="muted">${esc(e.label).toUpperCase()}</div>
                    </div>
                  `;
                }
                return `
                  <div class="list-item">
                    <div class="title">${esc(e.date)} • ${esc(e.competition)} • Rodada ${esc(e.matchDay)} • ${esc(e.homeId)} x ${esc(
                  e.awayId
                )}</div>
                    <div class="muted">${esc(e.competition).toUpperCase()}</div>
                  </div>
                `;
              })
              .join("")}
          </div>

          <button id="btn-back" class="btn">Voltar</button>
        </div>
      </div>
    `;

    document.getElementById("btn-back").onclick = () => {
      window.Game.setScreen("lobby");
      render();
    };

    document.getElementById("btn-advance-next-date").onclick = () => {
      const moved = window.Game.advanceOneEvent();
      if (!moved) alert("Sem próximos eventos.");
      render();
    };

    document.getElementById("btn-go-next-match").onclick = () => {
      const m = window.Game.openNextMatch();
      if (!m) return alert("Sem próximo jogo.");
      window.Game.setScreen("match");
      render();
    };
  }

  // -------------------------
  // MATCH (Central da Partida)
  // -------------------------
  function renderMatch(st) {
    const m = window.Game.getActiveMatch?.();
    if (!m) {
      root.innerHTML = `
        <div class="screen">
          <div class="card">
            <h2>Central da Partida</h2>
            <p class="muted">Nenhuma partida ativa. Volte e abra o Próximo Jogo.</p>
            <button id="btn-back" class="btn">Voltar</button>
          </div>
        </div>
      `;
      document.getElementById("btn-back").onclick = () => {
        window.Game.setScreen("lobby");
        render();
      };
      return;
    }

    const e = m.event;
    const home = e.fixture.homeId;
    const away = e.fixture.awayId;

    root.innerHTML = `
      <div class="screen">
        <div class="card">
          <h2>FCM TV • AMIGÁVEL / PARTIDA</h2>
          <div class="muted">${esc(e.date)} • ${esc(e.competition)} • Rodada ${esc(e.matchDay)}</div>

          <div class="match-row">
            <div class="team">
              <div class="team-name">${esc(home)}</div>
            </div>

            <div class="vs">VS</div>

            <div class="team">
              <div class="team-name">${esc(away)}</div>
            </div>
          </div>

          <div style="margin-top:14px">
            <div class="muted">QUALIDADE</div>
            <div class="quality-row">
              <button class="btn ${uiState.matchQuality === "BAIXO" ? "primary" : ""}" data-q="BAIXO">BAIXO</button>
              <button class="btn ${uiState.matchQuality === "MEDIO" ? "primary" : ""}" data-q="MEDIO">MÉDIO</button>
              <button class="btn ${uiState.matchQuality === "ALTO" ? "primary" : ""}" data-q="ALTO">ALTO</button>
            </div>
          </div>

          <div class="row" style="margin-top:14px">
            <button id="btn-sim" class="btn primary">SIMULAR JOGO</button>
            <button id="btn-play" class="btn" disabled>JOGAR (EM BREVE)</button>
          </div>

          <button id="btn-back" class="btn" style="margin-top:12px">Voltar</button>
        </div>
      </div>
    `;

    root.querySelectorAll("[data-q]").forEach(btn => {
      btn.onclick = () => {
        uiState.matchQuality = btn.getAttribute("data-q");
        render();
      };
    });

    document.getElementById("btn-back").onclick = () => {
      window.Game.setScreen("lobby");
      render();
    };

    document.getElementById("btn-sim").onclick = () => {
      try {
        const report = window.Game.simulateActiveMatch({ quality: uiState.matchQuality });
        uiState.lastMatchReport = report;
        window.Game.setScreen("postMatch");
        render();
      } catch (err) {
        console.error(err);
        alert(String(err?.message || err));
      }
    };
  }

  // -------------------------
  // POST MATCH
  // -------------------------
  function renderPostMatch(st) {
    const r = uiState.lastMatchReport || window.Game.getCareer()?.lastMatch || null;
    if (!r) {
      root.innerHTML = `
        <div class="screen">
          <div class="card">
            <h2>Pós-jogo</h2>
            <p class="muted">Nenhum relatório encontrado.</p>
            <button id="btn-back" class="btn">Voltar</button>
          </div>
        </div>
      `;
      document.getElementById("btn-back").onclick = () => {
        window.Game.setScreen("lobby");
        render();
      };
      return;
    }

    const score = `${r.goalsHome} - ${r.goalsAway}`;
    const motm = r.motm?.name ? `${r.motm.name} (${r.motm.team || ""})` : "—";

    root.innerHTML = `
      <div class="screen">
        <div class="card">
          <h2>FULL TIME</h2>
          <div class="muted">${esc(r.competition)} • ${esc(r.date)}</div>

          <div class="match-row">
            <div class="team">
              <div class="team-name">${esc(r.homeName || r.homeId)}</div>
            </div>

            <div class="vs score">${esc(score)}</div>

            <div class="team">
              <div class="team-name">${esc(r.awayName || r.awayId)}</div>
            </div>
          </div>

          <div class="card inner" style="margin-top:12px">
            <div><b>Jogador Estrela:</b> ${esc(motm)}</div>
          </div>

          <div class="card inner" style="margin-top:12px">
            <h3>Resumo</h3>
            <div class="muted">
              ${r.highlights?.length ? esc(r.highlights.slice(0, 6).join(" • ")) : "Sem destaques."}
            </div>
          </div>

          <button id="btn-continue" class="btn primary" style="margin-top:14px">CONTINUAR</button>
          <button id="btn-lobby" class="btn" style="margin-top:10px">VOLTAR AO LOBBY</button>
        </div>
      </div>
    `;

    document.getElementById("btn-continue").onclick = () => {
      window.Game.setScreen("lobby");
      render();
    };
    document.getElementById("btn-lobby").onclick = () => {
      window.Game.setScreen("lobby");
      render();
    };
  }

  // Expor render para debug
  window.UIRender = render;

  // Render inicial
  render();
})();