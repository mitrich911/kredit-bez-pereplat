import { Dec, d, kop, ZERO } from "./money";

export interface CardInput {
  /** Долг по карте: сумма покупок или снятых денег */
  debt: number;
  annualRate: number;
  /** Льготный период на эти операции, дней (0 — нет) */
  graceDays: number;
  minPayPercent: number;
  minPayMin: number;
  /** Минимальный платёж = % долга + начисленные проценты */
  minPayPlusInterest: boolean;
  /** Регулярные платы: подписки, СМС, обслуживание — в месяц */
  monthlyFee: number;
  /** Плата за каждый день, пока есть долг */
  dailyFee: number;
  /** Разовая комиссия за снятие наличных / перевод, % и минимум в рублях */
  cashFeePercent: number;
  cashFeeMin: number;
}

export type Strategy = { kind: "grace" } | { kind: "minimum" } | { kind: "fixed"; amount: number };

export interface CardResult {
  months: number;
  totalPaid: Dec;
  interest: Dec;
  fees: Dec;
  firstPayment: Dec;
  /** Долг не уменьшается: платёж не покрывает проценты и платы */
  neverEnds: boolean;
  /** Для «минимального» сценария: правило платежа пришлось уточнить */
  adjustedMinimum: boolean;
}

const MAX_MONTHS = 600;
const DAYS_IN_MONTH = 365 / 12;

/**
 * Помесячная модель долга по карте. Если долг не погашен в льготный период,
 * проценты начисляются с первого дня (так устроено большинство карт).
 * Проценты — остаток × ставка / 12: это оценка, банк считает по дням.
 */
export function simulateCard(input: CardInput, strategy: Strategy): CardResult {
  const cashFee = input.cashFeePercent > 0 || input.cashFeeMin > 0
    ? kop(Dec.max(d(input.debt).mul(input.cashFeePercent).div(100), input.cashFeeMin))
    : ZERO;

  if (strategy.kind === "grace") {
    // Вернули всё до конца льготного периода: процентов нет, платы — за эти дни
    const days = Math.max(input.graceDays, 1);
    const fees = kop(d(input.dailyFee).mul(days).plus(d(input.monthlyFee).mul(Math.ceil(days / DAYS_IN_MONTH)))).plus(cashFee);
    if (input.graceDays <= 0) {
      // Льготного периода нет: даже месяц долга стоит процентов
      const interest = kop(d(input.debt).mul(input.annualRate).div(1200));
      return { months: 1, totalPaid: kop(d(input.debt).plus(interest).plus(fees)), interest, fees, firstPayment: kop(d(input.debt).plus(interest)), neverEnds: false, adjustedMinimum: false };
    }
    return { months: Math.ceil(days / DAYS_IN_MONTH), totalPaid: kop(d(input.debt).plus(fees)), interest: ZERO, fees, firstPayment: kop(d(input.debt)), neverEnds: false, adjustedMinimum: false };
  }

  const run = (plusInterest: boolean): CardResult => {
    let balance = kop(input.debt);
    let interestSum = ZERO;
    let feesSum = cashFee;
    let paidSum = ZERO;
    let first = ZERO;
    let months = 0;
    const r = d(input.annualRate).div(1200);
    while (balance.greaterThan(0) && months < MAX_MONTHS) {
      months++;
      const interest = kop(balance.mul(r));
      const fees = kop(d(input.monthlyFee).plus(d(input.dailyFee).mul(DAYS_IN_MONTH)));
      const due = balance.plus(interest).plus(fees);
      let pay: Dec;
      if (strategy.kind === "fixed") pay = d(strategy.amount);
      else {
        pay = Dec.max(balance.mul(input.minPayPercent).div(100), input.minPayMin);
        if (plusInterest) pay = pay.plus(interest).plus(fees);
      }
      pay = kop(Dec.min(pay, due));
      if (months === 1) first = pay;
      if (pay.lessThanOrEqualTo(interest.plus(fees)) && pay.lessThan(due)) {
        // Платёж не уменьшает долг — дальше считать бессмысленно
        return { months: Infinity, totalPaid: paidSum, interest: interestSum, fees: feesSum, firstPayment: first, neverEnds: true, adjustedMinimum: false };
      }
      interestSum = interestSum.plus(interest);
      feesSum = feesSum.plus(fees);
      paidSum = paidSum.plus(pay);
      balance = due.minus(pay);
    }
    return { months, totalPaid: paidSum.plus(cashFee), interest: interestSum, fees: feesSum, firstPayment: first, neverEnds: balance.greaterThan(0), adjustedMinimum: false };
  };

  if (strategy.kind === "minimum") {
    const res = run(input.minPayPlusInterest);
    if (res.neverEnds && !input.minPayPlusInterest) {
      // По тарифу «% от задолженности» платёж меньше процентов. Банки так долг не оставляют —
      // считаем вариант, где проценты добавляются к минимальному платежу, и честно об этом пишем.
      return { ...run(true), adjustedMinimum: true };
    }
    return res;
  }
  return run(false);
}

/** Комиссия за снятие наличных или перевод. */
export function cashFee(amount: number, percent: number, min: number): Dec {
  return kop(Dec.max(d(amount).mul(percent).div(100), min));
}
