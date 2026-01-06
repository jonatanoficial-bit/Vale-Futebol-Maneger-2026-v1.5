export async function screenAdmin({ shell, repos, store, navigate }) {
  const s0 = store.getState();
  if (!s0.app.selectedPackId) { navigate("#/dataPackSelect"); return { render() {} }; }

  const pack = await repos.loadPack(s0.app.selectedPackId);

  const el = document.createElement("div");
  el.className = "grid";
  el.innerHTML = `
    <div class="card">
      <div class="card__header">
        <div>
          <div class="card__title">Admin</div>
          <div class="card__subtitle">Importar/Exportar DLC JSON • Validação</div>
        </div>
        <span class="badge">v0.9</span>
      </div>

      <div class="card__body">
        <div class="grid grid--2">
          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Exportar</div>
              <div class="muted" style="font-size:12px;margin-top:6px;line-height:1.35">
                Copie o JSON e salve como um novo pack no GitHub (DLC). Não substitui, só adiciona.
              </div>

              <div style="height:12px"></div>
              <button class="btn btn--primary" id="exportClubs">Exportar Clubes</button>
              <div style="height:8px"></div>
              <button class="btn" id="validateLogos">Validar Logos</button>
            </div>
          </div>

          <div class="card" style="border-radius:18px">
            <div class="card__body">
              <div style="font-weight:900">Importar</div>
              <div class="muted" style="font-size:12px;margin-top:6px;line-height:1.35">
                Cole JSON no formato <code>{"clubs":[...]}</code> e clique Importar. (MVP: guarda no localStorage do admin.)
              </div>

              <div style="height:10px"></div>
              <textarea class="input" id="json" style="min-height:220px;white-space:pre;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;"></textarea>

              <div style="height:10px"></div>
              <button class="btn btn--primary" id="import">Importar JSON</button>
              <div style="height:8px"></div>
              <div class="muted" style="font-size:12px" id="msg">-</div>
            </div>
          </div>
        </div>

        <div style="height:12px"></div>
        <button class="btn" id="back">Voltar</button>
      </div>
    </div>
  `;

  const $json = el.querySelector("#json");
  const $msg = el.querySelector("#msg");

  function setMsg(t) { $msg.textContent = t; }

  el.querySelector("#exportClubs").addEventListener("click", () => {
    const clubs = pack.content.clubs.clubs;
    const out = { clubs };
    $json.value = JSON.stringify(out, null, 2);
    setMsg(`Exportado: ${clubs.length} clube(s).`);
  });

  el.querySelector("#validateLogos").addEventListener("click", async () => {
    const clubs = pack.content.clubs.clubs;
    let ok = 0, fail = 0;

    for (const c of clubs) {
      const id = c.logoAssetId || c.id;
      const url = `/assets/logos/${id}.png`;
      // teste fetch simples
      try {
        const r = await fetch(url, { method: "GET" });
        if (r.ok) ok++; else fail++;
      } catch {
        fail++;
      }
    }

    setMsg(`Logos OK: ${ok} • Falhas: ${fail}`);
    alert(`Validação de logos concluída.\nOK: ${ok}\nFalhas: ${fail}`);
  });

  el.querySelector("#import").addEventListener("click", () => {
    try {
      const parsed = JSON.parse($json.value || "{}");
      if (!Array.isArray(parsed.clubs)) throw new Error("JSON inválido: esperado { clubs: [...] }");

      // MVP: salva no localStorage para você usar como base de DLC (sem quebrar pack original)
      localStorage.setItem("VFM_ADMIN_IMPORTED_CLUBS", JSON.stringify(parsed.clubs));
      setMsg(`Importado: ${parsed.clubs.length} clube(s). (Salvo no navegador)`);
      alert("Importado e salvo no navegador (MVP). Agora você pode exportar e montar seu pack DLC no GitHub.");
    } catch (e) {
      setMsg(String(e.message || e));
      alert(`Erro ao importar:\n${String(e.message || e)}`);
    }
  });

  el.querySelector("#back").addEventListener("click", () => navigate("#/splash"));

  shell.mount(el);
  setMsg("Pronto.");
  return { render() {} };
}