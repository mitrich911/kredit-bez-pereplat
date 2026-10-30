import { buildSchedule, type AccrualMode } from "./loan";
import { presentValue } from "./psk";
import { Dec, d, kop, ZERO } from "./money";

export interface CarProfile {
  name: string;
  price: number;
  /** Потеря стоимости в первый год, % */
  depreciationFirstYear: number;
  /** Потеря стоимости в каждый следующий год, % от текущей стоимости */
  depreciationNextYears: number;
  kaskoYearly: number;
  osagoYearly: number;
  maintenanceYearly: number;
  repairsYearly: number;
  kmPerYear: number;
  litersPer100: number;
  fuelPrice: number;
  horsepower: number;
  /** Ставка транспортного налога вашего региона, ₽ за л. с. */
  taxPerHp: number;
}

export interface CarFinancing {
  /** cash — за наличные, credit — в кредит */
  kind: "cash" | "credit";
  downPayment: number;
  annualRate: number;
  termMonths: number;
  /** Доп. услуги салона (сервисные карты, страховки, «подарки») */
  dealerExtras: number;
  /** Доп. услуги включены в кредит */
  extrasFinanced: boolean;
  /** Комиссии и разовые платежи по кредиту */
  loanFees: number;
}

export interface CarOptions {
  ownershipYears: number;
  /** Доходность сбережений, % годовых — для расчёта в «сегодняшних деньгах» */
  savingsYield: number;
  /** Рост цен на обслуживание и топливо, % в год */
  costInflation: number;
  startDate: string;
  accrual?: AccrualMode;
}

export interface CarBreakdown {
  purchase: Dec;
  interest: Dec;
  loanFees: Dec;
  dealerExtras: Dec;
  insurance: Dec;
  maintenance: Dec;
  fuel: Dec;
  tax: Dec;
  /** Потеря стоимости: цена − остаточная стоимость */
  depreciation: Dec;
}

export interface CarResult {
  /** Стоимость владения за весь период (все расходы минус выручка от продажи) */
  total: Dec;
  perYear: Dec;
  perMonth: Dec;
  /** То же в сегодняшних деньгах (дисконт по доходности сбережений) */
  presentValue: Dec;
  resaleValue: Dec;
  /** Остаток кредита на момент продажи (гасится из выручки) */
  debtAtSale: Dec;
  monthlyLoanPayment: Dec;
  breakdown: CarBreakdown;
  byYear: { year: number; running: Dec; loan: Dec }[];
}

export function residualValue(car: CarProfile, years: number): Dec {
  let value = d(car.price);
  for (let y = 1; y <= years; y++) {
    const rate = y === 1 ? car.depreciationFirstYear : car.depreciationNextYears;
    value = value.mul(d(1).minus(d(rate).div(100)));
  }
  return kop(value);
}

export function carCostOfOwnership(car: CarProfile, fin: CarFinancing, opt: CarOptions): CarResult {
  const months = Math.round(opt.ownershipYears * 12);
  const flows: number[] = new Array(months + 1).fill(0);
  const extrasUpfront = fin.extrasFinanced ? 0 : fin.dealerExtras;

  let interest = ZERO;
  let debtAtSale = ZERO;
  let monthlyLoanPayment = ZERO;
  let loanFees = ZERO;
  const loanByMonth: Dec[] = new Array(months + 1).fill(ZERO);

  if (fin.kind === "cash") {
    flows[0] += car.price + fin.dealerExtras;
  } else {
    const principal = car.price - fin.downPayment + (fin.extrasFinanced ? fin.dealerExtras : 0);
    loanFees = kop(fin.loanFees);
    flows[0] += fin.downPayment + extrasUpfront + fin.loanFees;
    if (principal > 0) {
      const s = buildSchedule({ principal, annualRate: fin.annualRate, termMonths: fin.termMonths, paymentType: "annuity", startDate: opt.startDate, accrual: opt.accrual });
      monthlyLoanPayment = s.firstPayment;
      for (const row of s.rows) {
        if (row.n > months) break;
        flows[row.n] += row.payment.toNumber();
        loanByMonth[row.n] = row.payment;
        interest = interest.plus(row.interest);
      }
      debtAtSale = s.rows[months - 1]?.balance ?? (months >= s.months ? ZERO : d(principal));
      if (s.months <= months) debtAtSale = ZERO;
    }
  }

  // Эксплуатация: годовые расходы платятся помесячно, растут с инфляцией цен
  let insurance = ZERO, maintenance = ZERO, fuel = ZERO, tax = ZERO;
  const byYear: { year: number; running: Dec; loan: Dec }[] = [];
  for (let y = 0; y < Math.ceil(opt.ownershipYears); y++) {
    const k = Math.pow(1 + opt.costInflation / 100, y);
    const share = Math.min(1, opt.ownershipYears - y);
    const ins = d(car.kaskoYearly + car.osagoYearly).mul(k).mul(share);
    const mnt = d(car.maintenanceYearly + car.repairsYearly).mul(k).mul(share);
    const fl = d(car.kmPerYear).div(100).mul(car.litersPer100).mul(car.fuelPrice).mul(k).mul(share);
    const tx = d(car.horsepower).mul(car.taxPerHp).mul(share);
    insurance = insurance.plus(ins);
    maintenance = maintenance.plus(mnt);
    fuel = fuel.plus(fl);
    tax = tax.plus(tx);
    const yearTotal = ins.plus(mnt).plus(fl).plus(tx);
    const mStart = y * 12 + 1;
    const mEnd = Math.min(months, mStart + 11);
    const n = mEnd - mStart + 1;
    let loanYear = ZERO;
    for (let m = mStart; m <= mEnd; m++) {
      flows[m] += yearTotal.div(n).toNumber();
      loanYear = loanYear.plus(loanByMonth[m]);
    }
    byYear.push({ year: y + 1, running: kop(yearTotal), loan: kop(loanYear) });
  }

  const resaleValue = residualValue(car, opt.ownershipYears);
  flows[months] -= resaleValue.minus(debtAtSale).toNumber();

  const breakdown: CarBreakdown = {
    purchase: kop(car.price),
    interest: kop(interest),
    loanFees,
    dealerExtras: kop(fin.dealerExtras),
    insurance: kop(insurance),
    maintenance: kop(maintenance),
    fuel: kop(fuel),
    tax: kop(tax),
    depreciation: kop(d(car.price).minus(resaleValue)),
  };
  // Итог = потеря стоимости + проценты + все расходы (цена возвращается частично при продаже)
  const total = kop(
    breakdown.depreciation.plus(breakdown.interest).plus(loanFees).plus(breakdown.dealerExtras)
      .plus(breakdown.insurance).plus(breakdown.maintenance).plus(breakdown.fuel).plus(breakdown.tax),
  );
  return {
    total,
    perYear: kop(total.div(opt.ownershipYears)),
    perMonth: kop(total.div(months)),
    presentValue: kop(presentValue(flows, opt.savingsYield)),
    resaleValue,
    debtAtSale: kop(debtAtSale),
    monthlyLoanPayment,
    breakdown,
    byYear,
  };
}
