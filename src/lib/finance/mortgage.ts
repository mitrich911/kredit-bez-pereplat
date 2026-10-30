import { buildSchedule, balanceOn, type LoanParams, type LoanSchedule, type Prepayment } from "./loan";
import { computePsk, type CashFlow } from "./psk";
import { Dec, d, kop, ZERO } from "./money";
import { addMonths } from "./dates";

export interface MortgageCosts {
  /** Страхование, % от остатка долга в год (жизнь + залог + титул) */
  insurancePercent: number;
  /** Страхование, фиксированная сумма в год */
  insuranceFixedYearly: number;
  /** Разовые расходы: оценка, нотариус, регистрация, комиссии банка */
  oneTimeCosts: number;
  /** Ежемесячные комиссии (обслуживание счёта и т. п.) */
  monthlyFees: number;
}

export interface MortgageInput extends Omit<LoanParams, "principal"> {
  propertyPrice: number;
  downPayment: number;
  costs: MortgageCosts;
}

export interface YearSummary {
  year: number;
  interest: Dec;
  principal: Dec;
  extra: Dec;
  insurance: Dec;
  balanceEnd: Dec;
}

export interface MortgageResult {
  loanAmount: Dec;
  schedule: LoanSchedule;
  insurance: Dec;
  insuranceByMonth: Map<number, Dec>;
  fees: Dec;
  /** Все выплаты банку: долг + проценты */
  loanPayments: Dec;
  /** Переплата: проценты + страховки + комиссии */
  overpayment: Dec;
  /** Полная стоимость покупки: взнос + выплаты банку + страховки + комиссии */
  fullCost: Dec;
  psk: number | null;
  years: YearSummary[];
}

export const NO_COSTS: MortgageCosts = {
  insurancePercent: 0,
  insuranceFixedYearly: 0,
  oneTimeCosts: 0,
  monthlyFees: 0,
};

/** Страховка платится в начале каждого года кредита от остатка долга на этот момент. */
function insuranceSchedule(schedule: LoanSchedule, principal: Dec, costs: MortgageCosts): Map<number, Dec> {
  const result = new Map<number, Dec>();
  if (costs.insurancePercent <= 0 && costs.insuranceFixedYearly <= 0) return result;
  for (let m = 0; m < schedule.months; m += 12) {
    const balance = m === 0 ? principal : schedule.rows[m - 1].balance;
    if (balance.lessThanOrEqualTo(0)) break;
    const premium = kop(balance.mul(costs.insurancePercent).div(100).plus(costs.insuranceFixedYearly));
    result.set(m, premium);
  }
  return result;
}

export function analyzeMortgage(input: MortgageInput): MortgageResult {
  const loanAmount = kop(d(input.propertyPrice).minus(input.downPayment));
  if (loanAmount.lessThanOrEqualTo(0)) throw new Error("Сумма кредита должна быть больше нуля");
  const schedule = buildSchedule({ ...input, principal: loanAmount.toNumber() });
  const costs = input.costs;
  const insuranceByMonth = insuranceSchedule(schedule, loanAmount, costs);
  const insurance = [...insuranceByMonth.values()].reduce((a, v) => a.plus(v), ZERO);
  const fees = kop(d(costs.oneTimeCosts).plus(d(costs.monthlyFees).mul(schedule.months)));
  const loanPayments = schedule.totalPaid;
  const overpayment = schedule.totalInterest.plus(insurance).plus(fees);
  const fullCost = d(input.downPayment).plus(loanPayments).plus(insurance).plus(fees);

  const flows: CashFlow[] = [
    {
      date: input.startDate,
      amount: loanAmount.negated().plus(costs.oneTimeCosts).plus(insuranceByMonth.get(0) ?? 0).toNumber(),
    },
  ];
  schedule.rows.forEach((row) => {
    const ins = insuranceByMonth.get(row.n) ?? ZERO;
    flows.push({
      date: row.date,
      amount: row.payment.plus(row.extra).plus(costs.monthlyFees).plus(ins).toNumber(),
    });
  });

  const years: YearSummary[] = [];
  schedule.rows.forEach((row, i) => {
    const yi = Math.floor(i / 12);
    if (!years[yi]) {
      years[yi] = { year: yi + 1, interest: ZERO, principal: ZERO, extra: ZERO, insurance: insuranceByMonth.get(yi * 12) ?? ZERO, balanceEnd: ZERO };
    }
    const y = years[yi];
    y.interest = y.interest.plus(row.interest);
    y.principal = y.principal.plus(row.principal);
    y.extra = y.extra.plus(row.extra);
    y.balanceEnd = row.balance;
  });

  return {
    loanAmount,
    schedule,
    insurance,
    insuranceByMonth,
    fees,
    loanPayments,
    overpayment,
    fullCost,
    psk: computePsk(flows),
    years,
  };
}

export interface PrepaymentEffect {
  base: MortgageResult;
  withPrepayments: MortgageResult;
  interestSaved: Dec;
  insuranceSaved: Dec;
  feesSaved: Dec;
  totalSaved: Dec;
  monthsSaved: number;
  paymentAfter: Dec;
}

/** Сравнение «как есть» и «с досрочными платежами» при прочих равных условиях. */
export function prepaymentEffect(input: MortgageInput, prepayments: Prepayment[]): PrepaymentEffect {
  const base = analyzeMortgage({ ...input, prepayments: [] });
  const withPrepayments = analyzeMortgage({ ...input, prepayments });
  const interestSaved = base.schedule.totalInterest.minus(withPrepayments.schedule.totalInterest);
  const insuranceSaved = base.insurance.minus(withPrepayments.insurance);
  const feesSaved = base.fees.minus(withPrepayments.fees);
  // Платёж сразу после первого досрочного взноса — показатель новой нагрузки.
  const rows = withPrepayments.schedule.rows;
  const firstExtra = rows.findIndex((r) => r.extra.greaterThan(0));
  const lastRow = firstExtra >= 0 && rows[firstExtra + 1] ? rows[firstExtra + 1] : rows[0];
  return {
    base,
    withPrepayments,
    interestSaved,
    insuranceSaved,
    feesSaved,
    totalSaved: interestSaved.plus(insuranceSaved).plus(feesSaved),
    monthsSaved: base.schedule.months - withPrepayments.schedule.months,
    paymentAfter: lastRow?.payment ?? ZERO,
  };
}

export function remainingDebtOn(input: MortgageInput, iso: string): Dec {
  const result = analyzeMortgage(input);
  return balanceOn(result.schedule, result.loanAmount.toNumber(), iso);
}

export function paymentDate(startDate: string, n: number): string {
  return addMonths(startDate, n);
}
