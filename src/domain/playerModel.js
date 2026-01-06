function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function calcOutfieldOverall(attr) {
  // estilo "FIFA-like" simplificado por 6 stats
  const pac = attr.pac ?? 50;
  const sho = attr.sho ?? 50;
  const pas = attr.pas ?? 50;
  const dri = attr.dri ?? 50;
  const def = attr.def ?? 50;
  const phy = attr.phy ?? 50;
  const avg = (pac + sho + pas + dri + def + phy) / 6;
  return Math.round(clamp(avg, 1, 99));
}

function calcGkOverall(attr) {
  const div = attr.gk_div ?? 50;
  const han = attr.gk_han ?? 50;
  const kic = attr.gk_kic ?? 50;
  const ref = attr.gk_ref ?? 50;
  const spe = attr.gk_spe ?? 50;
  const pos = attr.gk_pos ?? 50;
  const avg = (div + han + kic + ref + spe + pos) / 6;
  return Math.round(clamp(avg, 1, 99));
}

export function computeOverall(player) {
  const pos = (player.positions || [])[0] || "ST";
  const a = player.attributes || {};
  return pos === "GK" ? calcGkOverall(a) : calcOutfieldOverall(a);
}

export function calcAge(birthDateISO) {
  if (!birthDateISO) return null;
  const d = new Date(birthDateISO);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}