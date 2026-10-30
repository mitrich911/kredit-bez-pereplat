import { buildSchedule } from "./loan";
import { monthlyIrr, presentValue } from "./psk";
import { Dec, d, kop } from "./money";

export interface PurchaseInput {
  /** Цена при оплате сразу (с учётом скидки за наличные, если есть) */
  cashPrice: number;
  savingsYield: number;
  /** Рост цены товара, % в год (для варианта «накопить») */
  priceInflation: number;
  startDate: string;
  credit?: { annualRate: number; termMonths: number; oneTimeFees: number; monthlyFees: number; extraServices: number };
  installment?: {
    /** Цена в рассрочку (часто выше цены за наличные) */
    price: number;
    termMonths: number;
    downPayment: number;
    oneTimeFee: number;
    monthlyFee: number;
    /** Навязанные страховки и сервисы */
    extraServices: number;
  };
  saving?: { monthlyAmount: number; alreadySaved: number };
}

export interface PurchaseOption {
  id: "now" | "credit" | "installment" | "saving";
  title: string;
  /** Сколько вы заплатите всего, номинально */
  totalPaid: Dec;
  /** Переплата против цены сразу */
  overpayment: Dec;
  /** В сегодняшних деньгах — с учётом того, что деньги могли бы приносить доход */
  presentValue: Dec;
  /** Эффективная ставка, % годовых (как ПСК: месячная × 12) */
  effectiveRate: number | null;
  monthlyPayment: Dec;
  /** Через сколько месяцев вещь будет у вас */
  monthsToGet: number;
  note?: string;
}

function rate(flows: number[]): number | null {
  const i = monthlyIrr(flows);
  return i === null ? null : Math.round(i * 12 * 100 * 1000) / 1000;
}

export function comparePurchase(input: PurchaseInput): PurchaseOption[] {
  const options: PurchaseOption[] = [];
  const price = d(input.cashPrice);
  options.push({
    id: "now", title: "Купить сразу", totalPaid: kop(price), overpayment: d(0),
    presentValue: kop(price), effectiveRate: null, monthlyPayment: d(0), monthsToGet: 0,
  });

  if (input.credit) {
    const c = input.credit;
    const s = buildSchedule({ principal: input.cashPrice, annualRate: c.annualRate, termMonths: c.termMonths, paymentType: "annuity", startDate: input.startDate, accrual: "monthly" });
    const flows = [-(input.cashPrice) + c.oneTimeFees + c.extraServices, ...s.rows.map((r) => r.payment.toNumber() + c.monthlyFees)];
    const total = s.totalPaid.plus(c.oneTimeFees).plus(c.extraServices).plus(d(c.monthlyFees).mul(s.months));
    options.push({
      id: "credit", title: "Кредит", totalPaid: kop(total), overpayment: kop(total.minus(price)),
      presentValue: kop(presentValue(flows.map((f, k) => (k === 0 ? f + input.cashPrice : f)), input.savingsYield)),
      effectiveRate: rate(flows), monthlyPayment: s.firstPayment, monthsToGet: 0,
    });
  }

  if (input.installment) {
    const i = input.installment;
    const n = Math.max(i.termMonths, 1);
    const monthly = d(i.price).minus(i.downPayment).div(n);
    const flows = [-(input.cashPrice) + i.downPayment + i.oneTimeFee + i.extraServices];
    for (let k = 1; k <= n; k++) flows.push(monthly.plus(i.monthlyFee).toNumber());
    const total = d(i.price).plus(i.oneTimeFee).plus(i.extraServices).plus(d(i.monthlyFee).mul(n));
    const eff = rate(flows);
    options.push({
      id: "installment", title: "Рассрочка", totalPaid: kop(total), overpayment: kop(total.minus(price)),
      presentValue: kop(presentValue(flows.map((f, k) => (k === 0 ? f + input.cashPrice : f)), input.savingsYield)),
      effectiveRate: eff, monthlyPayment: kop(monthly.plus(i.monthlyFee)), monthsToGet: 0,
      note: eff !== null && eff > 0.001 ? `Рассрочка не бесплатная: это кредит под ${eff.toFixed(1)}% годовых` : "Рассрочка действительно без переплаты",
    });
  }

  if (input.saving && input.saving.monthlyAmount > 0) {
    const sv = input.saving;
    const r = input.savingsYield / 1200;
    const g = Math.pow(1 + input.priceInflation / 100, 1 / 12) - 1;
    let balance = sv.alreadySaved;
    let target = input.cashPrice;
    let m = 0;
    while (balance < target && m < 600) {
      m++;
      balance = balance * (1 + r) + sv.monthlyAmount;
      target = input.cashPrice * Math.pow(1 + g, m);
    }
    const reached = balance >= target;
    const finalPrice = d(target);
    const contributed = d(sv.alreadySaved).plus(d(sv.monthlyAmount).mul(m));
    const interestEarned = Dec.max(d(balance).minus(contributed), 0);
    const fmt = (v: Dec) => new Intl.NumberFormat("ru-RU").format(v.round().toNumber());
    options.push({
      id: "saving", title: "Накопить и купить", totalPaid: kop(finalPrice), overpayment: kop(finalPrice.minus(price)),
      presentValue: kop(presentValue([...new Array(m).fill(0), target], input.savingsYield)),
      effectiveRate: null, monthlyPayment: kop(sv.monthlyAmount), monthsToGet: reached ? m : -1,
      note: reached
        ? `За это время вы отложите ${fmt(contributed)} ₽ и получите ${fmt(interestEarned)} ₽ процентов по вкладу. Цена вырастет на ${fmt(finalPrice.minus(price))} ₽`
        : "При такой сумме накоплений цена растёт быстрее, чем копятся деньги",
    });
  }
  return options;
}
