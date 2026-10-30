import type { BankOffer, Product } from "@/data/bank-offers";
import { buildSchedule } from "./loan";
import { Dec } from "./money";

export interface Estimate {
  payment: Dec;
  overpayment: Dec;
}

export interface RankedOffer {
  offer: BankOffer;
  /** При минимальной опубликованной ставке — лучший случай */
  best: Estimate | null;
  /** При максимальной опубликованной ставке — худший случай */
  worst: Estimate | null;
  /** Почему предложение не подходит под запрос (сумма, срок) */
  limits: string[];
}

function estimate(amount: number, rate: number, termMonths: number, startDate: string): Estimate {
  const s = buildSchedule({ principal: amount, annualRate: rate, termMonths, paymentType: "annuity", startDate, accrual: "monthly" });
  return { payment: s.firstPayment, overpayment: s.totalInterest };
}

/**
 * Ориентировочный подбор: сортирует опубликованные предложения по минимальной ПСК
 * (она учитывает обязательные платежи), затем по минимальной ставке.
 * Предложения без опубликованных цифр идут в конце.
 */
export function rankOffers(offers: BankOffer[], product: Product, amount: number, termMonths: number, startDate: string): RankedOffer[] {
  const key = (o: BankOffer) => o.pskMin ?? o.rateMin ?? Number.POSITIVE_INFINITY;
  return offers
    .filter((o) => o.product === product)
    .map((offer) => {
      const limits: string[] = [];
      if (offer.amountMax && amount > offer.amountMax) limits.push(`сумма больше лимита банка (${(offer.amountMax / 1e6).toLocaleString("ru-RU")} млн ₽)`);
      if (offer.termMaxMonths && termMonths > offer.termMaxMonths) limits.push(`срок больше максимального (${offer.termMaxMonths} мес.)`);
      return {
        offer,
        best: offer.rateMin !== null && amount > 0 ? estimate(amount, offer.rateMin, termMonths, startDate) : null,
        worst: offer.rateMax !== null && amount > 0 ? estimate(amount, offer.rateMax, termMonths, startDate) : null,
        limits,
      };
    })
    .sort((a, b) => {
      if (a.limits.length !== b.limits.length) return a.limits.length - b.limits.length;
      return key(a.offer) - key(b.offer) || (a.offer.rateMin ?? 999) - (b.offer.rateMin ?? 999);
    });
}
