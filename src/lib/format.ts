type Numeric = number | { toNumber(): number };

const toNum = (v: Numeric) => (typeof v === "number" ? v : v.toNumber());

const rubFmt = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });
const kopFmt = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const rub = (v: Numeric) => `${rubFmt.format(Math.round(toNum(v)))} ₽`;
export const rubKop = (v: Numeric) => `${kopFmt.format(toNum(v))} ₽`;
export const num = (v: Numeric) => rubFmt.format(Math.round(toNum(v)));

/** Короткая запись для осей графиков: 1,2 млн, 350 тыс. */
export function short(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toLocaleString("ru-RU", { maximumFractionDigits: 1 })} млн`;
  if (a >= 1e3) return `${Math.round(v / 1e3).toLocaleString("ru-RU")} тыс`;
  return String(Math.round(v));
}

export const pct = (v: number, digits = 1) => `${v.toLocaleString("ru-RU", { maximumFractionDigits: digits })}%`;
