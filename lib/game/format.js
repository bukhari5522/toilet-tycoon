// Compact number formatting for small mobile screens: 950 · 1.2K · 3.4M · 2.1B
export function fmt(n) {
  const v = Math.floor(Math.abs(n));
  const sign = n < 0 ? "-" : "";
  if (v < 1000) return sign + v.toString();
  const units = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [base, suffix] of units) {
    if (v >= base) {
      const num = v / base;
      return sign + (num >= 100 ? Math.floor(num).toString() : num.toFixed(1).replace(/\.0$/, "")) + suffix;
    }
  }
  return sign + v.toString();
}

export function fmtDuration(ms) {
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
