export function isoDateAddDays(iso, days) {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isoCompare(a, b) {
  return String(a).localeCompare(String(b));
}

export function fmtDateBR(iso) {
  if (!iso) return "-";
  const [y, m, d] = String(iso).split("-");
  return `${d}/${m}/${y}`;
}