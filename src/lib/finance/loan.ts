import { addMonths, splitByYears } from "./dates";
import { Dec, d, kop, ZERO, min } from "./money";

export type PaymentType = "annuity" | "differentiated";
/** daily — по фактическим дням (365/366), как в большинстве российских банков; monthly — ставка/12. */
export type AccrualMode = "daily" | "monthly";
/** term — сократить срок, payment — уменьшить платёж. */
export type PrepaymentMode = "term" | "payment";

export interface Prepayment {
  /** once — разово, monthly — каждый месяц, yearly — раз в 12 месяцев */
  kind: "once" | "monthly" | "yearly";
  amount: number;
  /** Номер платежа (с 1), вместе с которым вносится досрочный платёж */
  month: number;
  /** Для monthly/yearly: последний номер платежа включительно */
  untilMonth?: number;
  mode: PrepaymentMode;
}

export interface LoanParams {
  principal: number;
  annualRate: number;
  termMonths: number;
  paymentType: PaymentType;
  startDate: string;
  accrual?: AccrualMode;
  prepayments?: Prepayment[];
}

export interface ScheduleRow {
  n: number;
  date: string;
  /** Плановый платёж (проценты + основной долг) */
  payment: Dec;
  interest: Dec;
  principal: Dec;
  /** Досрочный платёж в эту дату */
  extra: Dec;
  /** Остаток долга после платежа */
  balance: Dec;
}

export interface LoanSchedule {
  rows: ScheduleRow[];
  firstPayment: Dec;
  totalInterest: Dec;
  totalPrincipal: Dec;
  totalExtra: Dec;
  totalPaid: Dec;
  months: number;
  payoffDate: string;
}

export function monthlyRate(annualRate: number): Dec {
  return d(annualRate).div(1200);
}

/** Аннуитетный платёж: S × r / (1 − (1 + r)^−n), округлён до копеек. */
export function annuityPayment(principal: Dec | number, annualRate: number, months: number): Dec {
  const s = d(principal);
  if (months <= 0) return kop(s);
  const r = monthlyRate(annualRate);
  if (r.isZero()) return kop(s.div(months));
  const factor = r.plus(1).pow(-months);
  return kop(s.mul(r).div(d(1).minus(factor)));
}

export function accrueInterest(
  balance: Dec,
  annualRate: number,
  fromIso: string,
  toIso: string,
  mode: AccrualMode,
): Dec {
  if (mode === "monthly") return kop(balance.mul(monthlyRate(annualRate)));
  let total = ZERO;
  for (const part of splitByYears(fromIso, toIso)) {
    total = total.plus(balance.mul(annualRate).div(100).mul(part.days).div(part.yearDays));
  }
  return kop(total);
}

function prepaymentsAt(list: Prepayment[], n: number): Prepayment[] {
  return list.filter((p) => {
    if (p.amount <= 0) return false;
    if (p.kind === "once") return p.month === n;
    const until = p.untilMonth ?? Number.POSITIVE_INFINITY;
    if (n < p.month || n > until) return false;
    return p.kind === "monthly" || (n - p.month) % 12 === 0;
  });
}

/**
 * Строит график платежей. Досрочные платежи вносятся в дату очередного
 * платежа после списания планового. После досрочного платежа:
 * term — платёж прежний, срок сокращается; payment — платёж пересчитывается
 * на оставшийся срок.
 */
export function buildSchedule(params: LoanParams): LoanSchedule {
  const { annualRate, termMonths, paymentType, startDate } = params;
  const accrual = params.accrual ?? "daily";
  const prepayments = params.prepayments ?? [];
  let balance = kop(params.principal);
  let annuity = annuityPayment(balance, annualRate, termMonths);
  let principalPart = kop(balance.div(Math.max(termMonths, 1)));
  const rows: ScheduleRow[] = [];
  let prevDate = startDate;

  for (let n = 1; n <= termMonths && balance.greaterThan(0); n++) {
    const date = addMonths(startDate, n);
    const interest = accrueInterest(balance, annualRate, prevDate, date, accrual);
    let principal: Dec;
    if (paymentType === "annuity") {
      principal = annuity.minus(interest);
      if (principal.lessThan(0)) principal = ZERO;
    } else {
      principal = principalPart;
    }
    if (n === termMonths || principal.greaterThan(balance)) principal = balance;
    balance = balance.minus(principal);

    const active = prepaymentsAt(prepayments, n);
    let extra = ZERO;
    for (const p of active) extra = extra.plus(kop(p.amount));
    extra = min(extra, balance);
    balance = balance.minus(extra);

    rows.push({ n, date, payment: principal.plus(interest), interest, principal, extra, balance });

    if (extra.greaterThan(0) && balance.greaterThan(0) && active.some((p) => p.mode === "payment")) {
      const remaining = termMonths - n;
      annuity = annuityPayment(balance, annualRate, remaining);
      principalPart = kop(balance.div(Math.max(remaining, 1)));
    }
    prevDate = date;
  }

  const totalInterest = rows.reduce((a, r) => a.plus(r.interest), ZERO);
  const totalPrincipal = rows.reduce((a, r) => a.plus(r.principal), ZERO);
  const totalExtra = rows.reduce((a, r) => a.plus(r.extra), ZERO);
  return {
    rows,
    firstPayment: rows[0]?.payment ?? ZERO,
    totalInterest,
    totalPrincipal,
    totalExtra,
    totalPaid: totalInterest.plus(totalPrincipal).plus(totalExtra),
    months: rows.length,
    payoffDate: rows.at(-1)?.date ?? startDate,
  };
}

/** Остаток долга на дату: после последнего платежа, совершённого не позже этой даты. */
export function balanceOn(schedule: LoanSchedule, principal: number, iso: string): Dec {
  let balance = kop(principal);
  for (const row of schedule.rows) {
    if (row.date > iso) break;
    balance = row.balance;
  }
  return balance;
}

export { Dec };
