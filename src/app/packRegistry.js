// src/app/packRegistry.js

/**
 * Regra:
 * - Em produção, pode vir de um JSON (ex: /packs/index.json) OU lista estática
 * - Esta função SEMPRE retorna Array (nunca null/undefined)
 * - Se der erro de fetch, retorna [] e o diagnóstico acusa o motivo no console
 */

const DEFAULT_PACKS = [
  {
    id: "base-2025-26",
    name: "Base 2025/2026 (Brasil MVP)",
    recommended: true,
    notes: "—",
  },
];

export async function getPackRegistrySafe() {
  // Tenta buscar packs via arquivo (se você usar). Se não existir, cai no default.
  // Ajuste a URL se você tiver um endpoint real.
  const candidates = [
    "./packs/index.json", // relativo ao index
    "/packs/index.json",  // absoluto (Vercel)
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.packs)) return data.packs;
    } catch {
      // ignora e tenta próximo
    }
  }

  return DEFAULT_PACKS.slice();
}
