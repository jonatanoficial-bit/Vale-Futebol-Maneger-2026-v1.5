// /ui/ui.js
// UI principal da Fase 2: Capa -> DataPack -> Slots
// Sem frameworks, mobile-first.

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, String(v));
  }
  for (const c of children) node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  return node;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function fmtDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

function injectStylesOnce() {
  if (document.getElementById("vfm26-ui-styles")) return;

  const css = `
    :root{
      --bg:#08140e;
      --panel: rgba(0,0,0,0.40);
      --panel2: rgba(0,0,0,0.55);
      --line: rgba(0,255,127,0.30);
      --green:#00ff7f;
      --text:#ffffff;
      --muted: rgba(255,255,255,0.75);
      --danger:#ff4c4c;
    }

    .vfm-wrap{
      min-height:100vh;
      width:100%;
      display:flex;
      align-items:center;
      justify-content:center;
      background: radial-gradient(ellipse at center, rgba(0,255,127,0.08), transparent 55%) , var(--bg);
    }

    .vfm-card{
      width:min(560px, 92vw);
      border:1px solid var(--line);
      background: var(--panel);
      border-radius:16px;
      box-shadow: 0 10px 34px rgba(0,0,0,0.45);
      overflow:hidden;
    }

    .vfm-head{
      padding:16px 16px 12px 16px;
      background: linear-gradient(180deg, rgba(0,0,0,0.65), rgba(0,0,0,0.15));
      border-bottom:1px solid rgba(255,255,255,0.08);
    }

    .vfm-title{
      font-size:20px;
      font-weight:900;
      letter-spacing:0.6px;
      color: var(--green);
      margin:0;
    }

    .vfm-sub{
      margin-top:6px;
      font-size:13px;
      color: var(--muted);
      line-height:1.4;
    }

    .vfm-body{
      padding:16px;
    }

    .vfm-row{
      display:flex;
      gap:10px;
      flex-wrap:wrap;
    }

    .vfm-btn{
      appearance:none;
      border:0;
      cursor:pointer;
      width:100%;
      padding:14px 14px;
      border-radius:14px;
      font-weight:900;
      letter-spacing:0.6px;
      color:#072012;
      background: linear-gradient(180deg, #00ff7f, #00c963);
      box-shadow: 0 10px 22px rgba(0,0,0,0.25);
    }

    .vfm-btn:active{
      transform: translateY(1px);
    }

    .vfm-btn-secondary{
      background: linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0.06));
      color: var(--text);
      border:1px solid rgba(255,255,255,0.12);
    }

    .vfm-btn-danger{
      background: linear-gradient(180deg, rgba(255,76,76,0.85), rgba(200,40,40,0.85));
      color: #fff;
    }

    .vfm-list{
      display:flex;
      flex-direction:column;
      gap:10px;
    }

    .vfm-item{
      border:1px solid rgba(255,255,255,0.10);
      background: var(--panel2);
      border-radius:14px;
      padding:12px;
    }

    .vfm-item-title{
      font-weight:900;
      letter-spacing:0.4px;
      margin:0;
      font-size:14px;
    }

    .vfm-item-sub{
      margin-top:6px;
      font-size:12px;
      color: var(--muted);
      line-height:1.35;
    }

    .vfm-pill{
      display:inline-block;
      font-size:11px;
      padding:4px 8px;
      border-radius:999px;
      border:1px solid rgba(0,255,127,0.35);
      color: var(--green);
      margin-top:8px;
    }

    .vfm-error{
      margin-top:12px;
      padding:10px 12px;
      border-radius:12px;
      border:1px solid rgba(255,76,76,0.35);
      background: rgba(255,76,76,0.10);
      color: #ffd0d0;
      font-size:12px;
      line-height:1.35;
      word-break: break-word;
    }

    .vfm-footer{
      padding:14px 16px;
      border-top:1px solid rgba(255,255,255,0.08);
      background: rgba(0,0,0,0.25);
      display:flex;
      gap:10px;
    }

    .vfm-half{
      flex: 1;
      min-width: 140px;
    }
  `;

  const style = document.createElement("style");
  style.id = "vfm26-ui-styles";
  style.textContent = css;
  document.head.appendChild(style);
}

function showFatal(app, code, message) {
  clear(app);
  app.appendChild(
    el("div", { class: "vfm-wrap" }, [
      el("div", { class: "vfm-card" }, [
        el("div", { class: "vfm-head" }, [
          el("h1", { class: "vfm-title" }, ["Erro"]),
          el("div", { class: "vfm-sub" }, ["O jogo encontrou um problema e não pode continuar."])
        ]),
        el("div", { class: "vfm-body" }, [
          el("div", { class: "vfm-error" }, [
            `Código: ${code}\n\n${message}`
          ])
        ]),
        el("div", { class: "vfm-footer" }, [
          el("button", { class: "vfm-btn vfm-btn-secondary vfm-half", onclick: () => location.reload() }, ["RECARREGAR"])
        ])
      ])
    ])
  );
}

function mountCover(Engine, app, go) {
  clear(app);

  const card = el("div", { class: "vfm-card" }, [
    el("div", { class: "vfm-head" }, [
      el("h1", { class: "vfm-title" }, ["VALE FUTEBOL MANAGER 2026"]),
      el("div", { class: "vfm-sub" }, [
        "Simulador de futebol manager. Base sólida pronta. Agora: DataPack e Saves."
      ])
    ]),
    el("div", { class: "vfm-body" }, [
      el("div", { class: "vfm-list" }, [
        el("div", { class: "vfm-item" }, [
          el("p", { class: "vfm-item-title" }, ["MODO CARREIRA"]),
          el("div", { class: "vfm-item-sub" }, [
            "Fluxo obrigatório: DataPack → Save Slot → Carreira."
          ]),
          el("div", { class: "vfm-pill" }, [`Engine v${Engine.version}`])
        ])
      ])
    ]),
    el("div", { class: "vfm-footer" }, [
      el("button", { class: "vfm-btn vfm-half", onclick: () => go("datapack") }, ["INICIAR"])
    ])
  ]);

  app.appendChild(el("div", { class: "vfm-wrap" }, [card]));
}

function mountDataPack(Engine, app, go) {
  clear(app);

  const packs = Engine.datapacks.list();

  let errorBox = null;

  const list = el("div", { class: "vfm-list" }, packs.map(p => {
    return el("div", { class: "vfm-item" }, [
      el("p", { class: "vfm-item-title" }, [p.name]),
      el("div", { class: "vfm-item-sub" }, [
        `ID: ${p.id}\nRegião: ${p.region}\nPronto para expansão mundial: basta adicionar novos packs em /packs e registrar no catálogo.`
      ]),
      el("button", {
        class: "vfm-btn",
        onclick: async () => {
          try {
            if (errorBox) errorBox.remove();
            // carrega pack
            await Engine.datapacks.loadById(p.id);
            go("slots");
          } catch (e) {
            const msg = (e && e.message) ? e.message : "Falha desconhecida";
            errorBox = el("div", { class: "vfm-error" }, [
              `BOOT_E04_DATAPACK_LOAD\n\n${msg}`
            ]);
            containerBody.appendChild(errorBox);
            console.error("BOOT_E04_DATAPACK_LOAD", e);
          }
        }
      }, ["SELECIONAR"])
    ]);
  }));

  const containerBody = el("div", { class: "vfm-body" }, [
    el("div", { class: "vfm-sub", style: "margin-bottom:12px;" }, [
      "Escolha o pacote de dados. Ele define ligas, clubes e calendário. (Fase 2: Brasil)"
    ]),
    list
  ]);

  const card = el("div", { class: "vfm-card" }, [
    el("div", { class: "vfm-head" }, [
      el("h1", { class: "vfm-title" }, ["Escolher DataPack"]),
      el("div", { class: "vfm-sub" }, ["Sem mexer no código do jogo: os packs são arquivos JSON em /packs."])
    ]),
    containerBody,
    el("div", { class: "vfm-footer" }, [
      el("button", { class: "vfm-btn vfm-btn-secondary vfm-half", onclick: () => go("cover") }, ["VOLTAR"])
    ])
  ]);

  app.appendChild(el("div", { class: "vfm-wrap" }, [card]));
}

function mountSlots(Engine, app, go) {
  clear(app);

  if (!Engine.state.datapack) {
    showFatal(app, "SAVE_E00_NO_PACK", "Nenhum DataPack carregado. Volte e selecione um pack.");
    return;
  }

  const packId = Engine.state.datapack.id;

  function slotCard(slotNumber) {
    const sum = Engine.saves.getSlotSummary(slotNumber);

    let title = sum.exists ? "Continuar" : "Começar novo jogo";
    let sub = sum.exists
      ? `Atualizado: ${fmtDate(sum.meta && sum.meta.updatedAt)}\nPack: ${(sum.meta && sum.meta.packId) || "—"}`
      : `Slot vazio.\nPack atual: ${packId}`;

    if (sum.exists && sum.isCorrupted) {
      title = "Dados inválidos";
      sub = "Este slot parece corrompido. Recomendado apagar e criar novamente.";
    }

    const btnPrimaryText = sum.exists ? "ABRIR SLOT" : "CRIAR NOVO";

    return el("div", { class: "vfm-item" }, [
      el("p", { class: "vfm-item-title" }, [`SLOT ${slotNumber} — ${title}`]),
      el("div", { class: "vfm-item-sub" }, [sub]),
      el("div", { class: "vfm-row", style: "margin-top:10px;" }, [
        el("button", {
          class: "vfm-btn vfm-half",
          onclick: () => {
            // Se slot vazio, criar save mínimo agora
            if (!sum.exists || sum.isCorrupted) {
              Engine.saves.startNewInSlot(slotNumber, packId);
            }
            Engine.saves.selectSlot(slotNumber);

            // Próxima fase: criação de carreira
            go("next");
          }
        }, [btnPrimaryText]),

        el("button", {
          class: "vfm-btn vfm-btn-danger vfm-half",
          onclick: () => {
            Engine.saves.clearSlot(slotNumber);
            // re-render
            mountSlots(Engine, app, go);
          }
        }, ["APAGAR"])
      ])
    ]);
  }

  const card = el("div", { class: "vfm-card" }, [
    el("div", { class: "vfm-head" }, [
      el("h1", { class: "vfm-title" }, ["Escolher Save Slot"]),
      el("div", { class: "vfm-sub" }, [
        `DataPack ativo: ${Engine.state.datapack.name} (ID: ${packId})`
      ])
    ]),
    el("div", { class: "vfm-body" }, [
      el("div", { class: "vfm-list" }, [
        slotCard(1),
        slotCard(2)
      ])
    ]),
    el("div", { class: "vfm-footer" }, [
      el("button", { class: "vfm-btn vfm-btn-secondary vfm-half", onclick: () => go("datapack") }, ["VOLTAR"])
    ])
  ]);

  app.appendChild(el("div", { class: "vfm-wrap" }, [card]));
}

function mountNextPhaseHint(Engine, app, go) {
  clear(app);

  const card = el("div", { class: "vfm-card" }, [
    el("div", { class: "vfm-head" }, [
      el("h1", { class: "vfm-title" }, ["Próxima Etapa: Carreira"]),
      el("div", { class: "vfm-sub" }, [
        `Slot ${Engine.state.saveSlot} selecionado. Agora entra a criação de carreira (nome, avatar, país, cargo, clube).`
      ])
    ]),
    el("div", { class: "vfm-body" }, [
      el("div", { class: "vfm-item" }, [
        el("p", { class: "vfm-item-title" }, ["FASE 3 vai começar aqui"]),
        el("div", { class: "vfm-item-sub" }, [
          "Vamos montar o fluxo completo:\n- Criar perfil (nome/país/avatar)\n- Escolher cargo\n- Escolher clube do Brasil\n- Tutorial de boas-vindas\n- Lobby"
        ]),
        el("div", { class: "vfm-pill" }, [`Pack: ${Engine.state.datapack.id} | Slot: ${Engine.state.saveSlot}`])
      ])
    ]),
    el("div", { class: "vfm-footer" }, [
      el("button", { class: "vfm-btn vfm-btn-secondary vfm-half", onclick: () => go("slots") }, ["VOLTAR"]),
      el("button", {
        class: "vfm-btn vfm-half",
        onclick: () => {
          alert("Fase 2 concluída. Peça: 'Próxima fase' para eu iniciar a Fase 3 com os arquivos completos.");
        }
      }, ["CONTINUAR"])
    ])
  ]);

  app.appendChild(el("div", { class: "vfm-wrap" }, [card]));
}

export function mountUI(Engine, app) {
  injectStylesOnce();

  const routes = {
    cover: () => mountCover(Engine, app, go),
    datapack: () => mountDataPack(Engine, app, go),
    slots: () => mountSlots(Engine, app, go),
    next: () => mountNextPhaseHint(Engine, app, go)
  };

  function go(route) {
    const fn = routes[route];
    if (!fn) {
      showFatal(app, "UI_E01_ROUTE_NOT_FOUND", `Rota UI não encontrada: ${route}`);
      return;
    }
    fn();
  }

  // Início obrigatório em "Capa"
  go("cover");
}