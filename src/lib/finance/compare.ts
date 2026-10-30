import { analyzeMortgage, type MortgageResult } from "./mortgage";
import type { PaymentType, AccrualMode } from "./loan";
import { Dec } from "./money";

export interface Offer {
  name: string;
  /** Сколько нужно получить на руки / на покупку */
  amount: number;
  annualRate: number;
  termMonths: number;
  paymentType: PaymentType;
  insurancePercent: number;
  insuranceFixedYearly: number;
  oneTimeFees: number;
  monthlyFees: number;
  /** Дополнительные услуги (сервисы, «подписки», карты) — разовая сумма */
  extraServices: number;
  /** Услуги включаются в сумму кредита (на них тоже начисляются проценты) */
  extraServicesFinanced: boolean;
  /** Условия досрочного погашения — текстом, для справки */
  earlyRepayment?: string;
  /** Предложение из каталога банков, если условия подставлены оттуда */
  sourceId?: string;
}

export interface OfferResult {
  offer: Offer;
  result: MortgageResult;
  payment: Dec;
  /** Всё, что вы отдадите сверх полученной суммы */
  overpayment: Dec;
  totalOutflow: Dec;
  psk: number | null;
  rank: number;
}

export interface Comparison {
  results: OfferResult[];
  best: OfferResult;
  sameTerms: boolean;
  /** Разница между лучшим и худшим по переплате */
  spread: Dec;
}

export function compareOffers(offers: Offer[], startDate: string, accrual: AccrualMode = "daily"): Comparison {
  if (offers.length === 0) throw new Error("Нужно хотя бы одно предложение");
  const results = offers.map((offer) => {
    const financed = offer.extraServicesFinanced ? offer.extraServices : 0;
    const upfront = offer.extraServicesFinanced ? 0 : offer.extraServices;
    const loan = offer.amount + financed;
    const result = analyzeMortgage({
      propertyPrice: loan,
      downPayment: 0,
      annualRate: offer.annualRate,
      termMonths: offer.termMonths,
      paymentType: offer.paymentType,
      startDate,
      accrual,
      costs: {
        insurancePercent: offer.insurancePercent,
        insuranceFixedYearly: offer.insuranceFixedYearly,
        oneTimeCosts: offer.oneTimeFees + upfront,
        monthlyFees: offer.monthlyFees,
      },
    });
    const totalOutflow = result.loanPayments.plus(result.insurance).plus(result.fees);
    return {
      offer,
      result,
      payment: result.schedule.firstPayment,
      overpayment: totalOutflow.minus(offer.amount),
      totalOutflow,
      psk: result.psk,
      rank: 0,
    };
  });
  // При одинаковых сумме и сроке честно сравнивать переплату в рублях;
  // при разных — переплата всегда меньше у короткого срока, поэтому ранжируем по ПСК.
  const sameTerms = new Set(offers.map((o) => `${o.amount}|${o.termMonths}`)).size === 1;
  const sorted = [...results].sort((a, b) =>
    sameTerms || a.psk === null || b.psk === null ? a.overpayment.comparedTo(b.overpayment) : a.psk - b.psk,
  );
  sorted.forEach((r, i) => (r.rank = i + 1));
  return {
    results,
    best: sorted[0],
    sameTerms,
    spread: Dec.max(...results.map((r) => r.overpayment)).minus(Dec.min(...results.map((r) => r.overpayment))),
  };
}
