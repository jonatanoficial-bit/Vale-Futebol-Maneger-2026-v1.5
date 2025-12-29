// /engine/boot-check.js
// BootCheck existe para garantir diagnóstico claro e impedir tela preta.

function waitForDOM() {
  return new Promise((resolve) => {
    if (document.readyState === "interactive" || document.readyState === "complete") {
      resolve(true);
      return;
    }
    document.addEventListener("DOMContentLoaded", () => resolve(true), { once: true });
  });
}

export async function runBootCheck() {
  console.log("BOOT_STEPS: BootCheck begin");

  await waitForDOM();

  // Verificações mínimas obrigatórias
  if (!document.getElementById("app")) {
    throw new Error("BootCheck: #app não encontrado.");
  }

  // Estrutura obrigatória do projeto (não testa existência de arquivo via FS — apenas sanity checks)
  // Aqui nós validamos o ambiente para o jogo rodar no GitHub Pages.
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("BootCheck: ambiente inválido (window/document ausentes).");
  }

  // Sanity check para módulos
  // (Se este arquivo foi carregado, modules estão ok)
  console.log("BOOT_STEPS: BootCheck ok");
  return true;
}
