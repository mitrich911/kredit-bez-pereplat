import { daysBetween, addMonths } from "./dates";

export interface CashFlow {
  date: string;
  /** Выдача кредита — отрицательная сумма, платежи заёмщика — положительные */
  amount: number;
}

/**
 * Полная стоимость кредита в % годовых по формуле ч. 2 ст. 6 353-ФЗ:
 * ПСК = i × ЧБП × 100, где i — корень уравнения
 * Σ ДПk / ((1 + ek·i)(1 + i)^qk) = 0.
 * Базовый период — месяц (ЧБП = 12), qk — число полных месяцев от первого
 * потока, ek — остаток в долях месяца (дни / (365/12)).
 * Это оценка по введённым данным; официальная ПСК указывается в договоре.
 */
export function computePsk(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null;
  const start = flows[0].date;
  const terms = flows.map((f) => {
    let q = 0;
    while (addMonths(start, q + 1) <= f.date) q++;
    const e = daysBetween(addMonths(start, q), f.date) / (365 / 12);
    return { q, e, amount: f.amount };
  });
  const npv = (i: number) =>
    terms.reduce((acc, t) => acc + t.amount / ((1 + t.e * i) * Math.pow(1 + i, t.q)), 0);

  // Бисекция: npv убывает по i, если сначала получаем деньги, потом отдаём.
  let lo = -0.99;
  let hi = 1;
  let fLo = npv(lo);
  const fHi = npv(hi);
  if (Number.isNaN(fLo) || Number.isNaN(fHi) || Math.sign(fLo) === Math.sign(fHi)) return null;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-9 || hi - lo < 1e-12) {
      lo = hi = mid;
      break;
    }
    if (Math.sign(fMid) === Math.sign(fLo)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }
  return Math.round(((lo + hi) / 2) * 12 * 100 * 1000) / 1000;
}

/** Внутренняя месячная доходность ряда равномерных месячных потоков (поток 0 — сегодня). */
export function monthlyIrr(flows: number[]): number | null {
  const npv = (i: number) => flows.reduce((acc, f, k) => acc + f / Math.pow(1 + i, k), 0);
  let lo = -0.99;
  let hi = 1;
  let fLo = npv(lo);
  const fHi = npv(hi);
  if (Math.sign(fLo) === Math.sign(fHi)) return null;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-9) return mid;
    if (Math.sign(fMid) === Math.sign(fLo)) {
      lo = mid;
      fLo = fMid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/** Приведённая стоимость месячных платежей при годовой доходности сбережений. */
export function presentValue(monthlyFlows: number[], annualYieldPercent: number): number {
  const r = annualYieldPercent / 1200;
  return monthlyFlows.reduce((acc, f, k) => acc + f / Math.pow(1 + r, k), 0);
}
