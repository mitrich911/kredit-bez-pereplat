import { describe, expect, it } from "vitest";
import { analyzeMortgage, prepaymentEffect, NO_COSTS, type MortgageInput } from "./mortgage";
import { computePsk } from "./psk";
import { optimize } from "./optimizer";
import { analyzeRefinance } from "./refinance";
import { compareOffers, type Offer } from "./compare";
import { carCostOfOwnership, residualValue, type CarProfile } from "./car";
import { comparePurchase } from "./purchase";
import { adviseMortgage } from "./advisor";
import { addMonths } from "./dates";

const mortgage: MortgageInput = {
  propertyPrice: 7_000_000,
  downPayment: 1_400_000,
  annualRate: 16,
  termMonths: 240,
  paymentType: "annuity",
  startDate: "2026-11-01",
  accrual: "monthly",
  costs: { insurancePercent: 0.5, insuranceFixedYearly: 0, oneTimeCosts: 50_000, monthlyFees: 0 },
};

describe("ПСК", () => {
  it("без комиссий равна номинальной ставке", () => {
    const r = analyzeMortgage({ ...mortgage, costs: NO_COSTS });
    expect(r.psk).not.toBeNull();
    expect(Math.abs(r.psk! - 16)).toBeLessThan(0.01);
  });
  it("комиссии и страховки повышают ПСК", () => {
    const r = analyzeMortgage(mortgage);
    expect(r.psk!).toBeGreaterThan(16.3);
  });
  it("простой поток: 100 000 сегодня, 110 000 через 12 месяцев ≈ 9,569%", () => {
    // (1+i)^12 = 1,1 → i = 0,0079741 → ×12×100
    const psk = computePsk([
      { date: "2026-01-10", amount: -100_000 },
      { date: addMonths("2026-01-10", 12), amount: 110_000 },
    ]);
    expect(psk).toBeCloseTo(9.569, 2);
  });
});

describe("ипотека: показатели не смешиваются", () => {
  it("полная стоимость = взнос + выплаты банку + страховки + комиссии", () => {
    const r = analyzeMortgage(mortgage);
    expect(r.loanAmount.toNumber()).toBe(5_600_000);
    expect(r.fullCost.toFixed(2)).toBe(r.loanPayments.plus(1_400_000).plus(r.insurance).plus(r.fees).toFixed(2));
    expect(r.overpayment.toFixed(2)).toBe(r.schedule.totalInterest.plus(r.insurance).plus(r.fees).toFixed(2));
    expect(r.insurance.greaterThan(0)).toBe(true);
  });
  it("досрочка снижает и проценты, и страховку", () => {
    const e = prepaymentEffect(mortgage, [{ kind: "monthly", amount: 5000, month: 1, mode: "term" }]);
    expect(e.interestSaved.greaterThan(0)).toBe(true);
    expect(e.insuranceSaved.greaterThan(0)).toBe(true);
    expect(e.monthsSaved).toBeGreaterThan(0);
  });
  it("сумма кредита должна быть положительной", () => {
    expect(() => analyzeMortgage({ ...mortgage, downPayment: 7_000_000 })).toThrow();
  });
});

describe("оптимизатор", () => {
  it("выбирает выгодный сценарий в пределах бюджета и не трогает резерв", () => {
    const o = optimize(mortgage, { monthlyExtra: 10_000, savings: 600_000, reserve: 400_000, monthlyIncome: 250_000 });
    expect(o.freeCash.toNumber()).toBe(200_000);
    expect(o.best.feasible).toBe(true);
    expect(o.best.saved.greaterThan(0)).toBe(true);
    expect(o.best.lumpUsed.lessThanOrEqualTo(200_000)).toBe(true);
    const base = o.scenarios.find((s) => s.id === "base")!;
    expect(o.best.maxMonthlyLoad.lessThanOrEqualTo(base.maxMonthlyLoad.plus(10_000).plus(0.01))).toBe(true);
  });
  it("отсекает сценарий, если нагрузка превышает половину дохода", () => {
    const o = optimize(mortgage, { monthlyExtra: 30_000, savings: 0, reserve: 0, monthlyIncome: 200_000 });
    const monthly = o.scenarios.find((s) => s.id === "monthly-term")!;
    expect(monthly.feasible).toBe(false);
  });
  it("разбор не содержит цифр, которых нет в расчёте", () => {
    const o = optimize(mortgage, { monthlyExtra: 5000, savings: 0, reserve: 0, monthlyIncome: 0 });
    const blocks = adviseMortgage(7_000_000, o.scenarios[0].result, o);
    const best = blocks.find((b) => b.tone === "good")!;
    const saved = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(o.best.saved.toNumber());
    expect(best.text).toContain(saved);
  });
});

describe("рефинансирование", () => {
  const input = {
    balance: 4_000_000, currentRate: 20, remainingMonths: 180, currentInsurancePercent: 0.5,
    newRate: 15, newTermMonths: 180, newInsurancePercent: 0.5, switchCosts: 60_000,
    paymentType: "annuity" as const, startDate: "2026-11-01",
  };
  it("снижение ставки выгодно и окупается", () => {
    const r = analyzeRefinance(input);
    expect(r.newPayment.lessThan(r.currentPayment)).toBe(true);
    expect(r.saved.greaterThan(0)).toBe(true);
    expect(r.breakEvenMonth).not.toBeNull();
    expect(r.breakEvenMonth!).toBeLessThan(12);
  });
  it("та же ставка с расходами — невыгодно", () => {
    const r = analyzeRefinance({ ...input, newRate: 20 });
    expect(r.saved.toNumber()).toBeCloseTo(-60_000, 0);
    expect(r.breakEvenMonth).toBeNull();
  });
});

describe("сравнение предложений", () => {
  const offer: Offer = {
    name: "А", amount: 1_000_000, annualRate: 20, termMonths: 60, paymentType: "annuity",
    insurancePercent: 0, insuranceFixedYearly: 0, oneTimeFees: 0, monthlyFees: 0, extraServices: 0, extraServicesFinanced: false,
  };
  it("низкая ставка с навязанной услугой может проиграть", () => {
    const c = compareOffers(
      [offer, { ...offer, name: "Б", annualRate: 18, extraServices: 150_000, extraServicesFinanced: true }],
      "2026-11-01",
    );
    expect(c.sameTerms).toBe(true);
    expect(c.best.offer.name).toBe("А");
    expect(c.spread.greaterThan(0)).toBe(true);
  });
});

describe("автомобиль", () => {
  const car: CarProfile = {
    name: "Тест", price: 2_000_000, depreciationFirstYear: 20, depreciationNextYears: 10,
    kaskoYearly: 80_000, osagoYearly: 10_000, maintenanceYearly: 30_000, repairsYearly: 10_000,
    kmPerYear: 15_000, litersPer100: 8, fuelPrice: 60, horsepower: 150, taxPerHp: 10,
  };
  const opt = { ownershipYears: 3, savingsYield: 0, costInflation: 0, startDate: "2026-11-01" };
  it("остаточная стоимость: 2 млн × 0,8 × 0,9 × 0,9", () => {
    expect(residualValue(car, 3).toFixed(2)).toBe("1296000.00");
  });
  it("кредит дороже наличных на проценты и комиссии", () => {
    const cash = carCostOfOwnership(car, { kind: "cash", downPayment: 0, annualRate: 0, termMonths: 0, dealerExtras: 0, extrasFinanced: false, loanFees: 0 }, opt);
    const credit = carCostOfOwnership(car, { kind: "credit", downPayment: 500_000, annualRate: 15, termMonths: 60, dealerExtras: 0, extrasFinanced: false, loanFees: 5000 }, opt);
    // Топливо 15000/100×8×60 = 72 000 в год; налог 1 500
    expect(cash.breakdown.fuel.toFixed(2)).toBe("216000.00");
    expect(cash.breakdown.tax.toFixed(2)).toBe("4500.00");
    expect(cash.total.toFixed(2)).toBe("1314500.00"); // 704 000 + 3×(90 000+40 000+72 000+1 500)
    expect(credit.total.minus(cash.total).toFixed(2)).toBe(credit.breakdown.interest.plus(5000).toFixed(2));
    expect(credit.debtAtSale.greaterThan(0)).toBe(true);
  });
});

describe("крупные покупки", () => {
  it("«рассрочка 0%» при потере скидки за наличные — это кредит", () => {
    const opts = comparePurchase({
      cashPrice: 90_000, savingsYield: 0, priceInflation: 0, startDate: "2026-11-01",
      installment: { price: 100_000, termMonths: 10, downPayment: 0, oneTimeFee: 0, monthlyFee: 0, extraServices: 0 },
    });
    const inst = opts.find((o) => o.id === "installment")!;
    expect(inst.overpayment.toNumber()).toBe(10_000);
    expect(inst.effectiveRate!).toBeGreaterThan(20);
  });
  it("честная рассрочка без доплат — 0%", () => {
    const opts = comparePurchase({
      cashPrice: 100_000, savingsYield: 0, priceInflation: 0, startDate: "2026-11-01",
      installment: { price: 100_000, termMonths: 10, downPayment: 0, oneTimeFee: 0, monthlyFee: 0, extraServices: 0 },
    });
    expect(Math.abs(opts.find((o) => o.id === "installment")!.effectiveRate!)).toBeLessThan(0.001);
  });
  it("накопление: срок до покупки с ростом цены", () => {
    const opts = comparePurchase({
      cashPrice: 100_000, savingsYield: 0, priceInflation: 0, startDate: "2026-11-01",
      saving: { monthlyAmount: 10_000, alreadySaved: 0 },
    });
    expect(opts.find((o) => o.id === "saving")!.monthsToGet).toBe(10);
  });
});
