import { getPlayerStatus, setPlayerStatus, tickInjuryDays } from "./playerStatus.js";

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function planProfile(plan) {
  // impacto semanal (7 dias)
  // INTENSE: melhora sharpness+morale, mas consome fitness e aumenta risco de lesão
  // LIGHT: recupera fitness, mas sharpness sobe menos
  if (plan === "INTENSE") return { fit: -6, sharp: +6, mor: +2, injRisk: 0.045 };
  if (plan === "LIGHT") return { fit: +8, sharp: +2, mor: +1, injRisk: 0.010 };
  return { fit: +2, sharp: +4, mor: +1, injRisk: 0.022 }; // BALANCED
}

function focusBonus(focus) {
  // MVP: apenas flavor (para futuro: atributos por área)
  if (focus === "PHYSICAL") return { fit: +3, sharp: 0, mor: 0 };
  if (focus === "TECHNICAL") return { fit: 0, sharp: +2, mor: 0 };
  if (focus === "ATTACK") return { fit: 0, sharp: +1, mor: +1 };
  if (focus === "DEFENSE") return { fit: 0, sharp: +1, mor: +1 };
  return { fit: 0, sharp: 0, mor: +1 }; // GENERAL
}

function pseudoRng(seed) {
  // RNG simples e determinístico (sem libs externas)
  let x = 0;
  for (let i = 0; i < seed.length; i++) x = (x * 31 + seed.charCodeAt(i)) >>> 0;
  return function () {
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return (x >>> 0) / 4294967296;
  };
}

export function applyWeeklyTrainingToSquad({ state, squad, plan, focus, weekKey }) {
  let next = structuredClone(state);

  const prof = planProfile(plan);
  const bonus = focusBonus(focus);

  // recuperação de lesão acontece toda semana
  next = tickInjuryDays(next, 7);

  for (const p of squad) {
    const cur = getPlayerStatus(next, p.id);

    const rng = pseudoRng(`${weekKey}::${p.id}`);
    const injuryRoll = rng();

    // risco de lesão cresce se fitness baixo
    const lowFitRisk = cur.fitness < 55 ? 0.030 : 0;
    const risk = prof.injRisk + lowFitRisk;

    let injuryDays = cur.injuryDays;
    if (injuryDays === 0 && injuryRoll < risk) {
      // lesão leve/moderada
      const d = Math.floor(rng() * 21) + 7; // 7..27 dias
      injuryDays = d;
    }

    const fitness = clamp(cur.fitness + prof.fit + bonus.fit, 0, 100);
    const sharpness = clamp(cur.sharpness + prof.sharp + bonus.sharp - (injuryDays > 0 ? 4 : 0), 0, 100);
    const morale = clamp(cur.morale + prof.mor + bonus.mor, 0, 100);

    next = setPlayerStatus(next, p.id, { fitness, sharpness, morale, injuryDays });
  }

  // registra preferências
  if (!next.career.training) next.career.training = {};
  next.career.training.plan = plan;
  next.career.training.focus = focus;
  next.career.training.lastAppliedIso = new Date().toISOString();

  return next;
}