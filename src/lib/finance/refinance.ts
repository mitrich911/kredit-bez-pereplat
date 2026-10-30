import { buildSchedule, type PaymentType, type AccrualMode } from "./loan";
import { Dec, d, kop, ZERO } from "./money";

export interface RefinanceInput {
  balance: number;
  currentRate: number;
  remainingMonths: number;
  /** Страхование сейчас, % от остатка в год */
  currentInsurancePercent: number;
  newRate: number;
  newTermMonths: number;
  newInsurancePercent: number;
  /** Расходы на переход: оценка, регистрация, комиссии */
  switchCosts: number;
  paymentType: PaymentType;
  startDate: string;
  accrual?: AccrualMode;
}

export interface RefinanceResult {
  currentPayment: Dec;
  newPayment: Dec;
  currentTotal: Dec;
  newTotal: Dec;
  /** Выгода с учётом расходов на переход; отрицательная — переход невыгоден */
  saved: Dec;
  /** Через сколько месяцев экономия окупит расходы на переход; null — не окупится */
  breakEvenMonth: number | null;
  currentInterest: Dec;
  newInterest: Dec;
}

function yearlyInsurance(rows: { balance: Dec }[], start: Dec, percent: number): Dec[] {
  const byMonth: Dec[] = [];
  for (let m = 0; m < rows.length; m++) {
    if (m % 12 === 0 && percent > 0) {
      const bal = m === 0 ? start : rows[m - 1].balance;
      byMonth.push(kop(bal.mul(percent).div(100)));
    } else byMonth.push(ZERO);
  }
  return byMonth;
}

export function analyzeRefinance(input: RefinanceInput): RefinanceResult {
  const common = { principal: input.balance, paymentType: input.paymentType, startDate: input.startDate, accrual: input.accrual };
  const cur = buildSchedule({ ...common, annualRate: input.currentRate, termMonths: input.remainingMonths });
  const nxt = buildSchedule({ ...common, annualRate: input.newRate, termMonths: input.newTermMonths });
  const start = d(input.balance);
  const curIns = yearlyInsurance(cur.rows, start, input.currentInsurancePercent);
  const newIns = yearlyInsurance(nxt.rows, start, input.newInsurancePercent);
  const curTotal = cur.totalPaid.plus(curIns.reduce((a, v) => a.plus(v), ZERO));
  const newTotal = nxt.totalPaid.plus(newIns.reduce((a, v) => a.plus(v), ZERO)).plus(input.switchCosts);

  // Окупаемость: накопленная разница выплат против расходов на переход
  let cumulative = d(input.switchCosts).negated();
  let breakEvenMonth: number | null = input.switchCosts <= 0 ? 0 : null;
  const months = Math.max(cur.rows.length, nxt.rows.length);
  for (let m = 0; m < months && breakEvenMonth === null; m++) {
    const curFlow = (cur.rows[m]?.payment ?? ZERO).plus(curIns[m] ?? ZERO);
    const newFlow = (nxt.rows[m]?.payment ?? ZERO).plus(newIns[m] ?? ZERO);
    cumulative = cumulative.plus(curFlow.minus(newFlow));
    if (cumulative.greaterThanOrEqualTo(0)) breakEvenMonth = m + 1;
  }

  return {
    currentPayment: cur.firstPayment,
    newPayment: nxt.firstPayment,
    currentTotal: curTotal,
    newTotal,
    saved: curTotal.minus(newTotal),
    breakEvenMonth,
    currentInterest: cur.totalInterest,
    newInterest: nxt.totalInterest,
  };
}
