import { describe, expect, it } from "vitest";
import { simulateCard, type CardInput } from "./card";
import { CREDIT_CARDS } from "@/data/credit-cards";

const base: CardInput = {
  debt: 100_000, annualRate: 36, graceDays: 55, minPayPercent: 5, minPayMin: 300, minPayPlusInterest: false,
  monthlyFee: 0, dailyFee: 0, cashFeePercent: 0, cashFeeMin: 0,
};

describe("кредитная карта", () => {
  it("погашение в льготный период — без процентов", () => {
    const r = simulateCard(base, { kind: "grace" });
    expect(r.interest.toNumber()).toBe(0);
    expect(r.totalPaid.toNumber()).toBe(100_000);
  });
  it("без льготного периода даже месяц долга стоит процентов", () => {
    const r = simulateCard({ ...base, graceDays: 0 }, { kind: "grace" });
    expect(r.interest.toNumber()).toBe(3000); // 100 000 × 36% / 12
  });
  it("ежедневная плата набегает за льготный период", () => {
    const r = simulateCard({ ...base, dailyFee: 50 }, { kind: "grace" });
    expect(r.fees.toNumber()).toBe(2750); // 55 дней × 50 ₽
  });
  it("фиксированный платёж: первый месяц — проценты 3%, долг гасится полностью", () => {
    const r = simulateCard(base, { kind: "fixed", amount: 10_000 });
    expect(r.firstPayment.toNumber()).toBe(10_000);
    expect(r.neverEnds).toBe(false);
    expect(r.totalPaid.minus(r.interest).toFixed(2)).toBe("100000.00");
  });
  it("минимальный платёж растягивает долг и даёт большую переплату", () => {
    const fixed = simulateCard(base, { kind: "fixed", amount: 10_000 });
    const min = simulateCard(base, { kind: "minimum" });
    expect(min.months).toBeGreaterThan(fixed.months);
    expect(min.interest.greaterThan(fixed.interest)).toBe(true);
  });
  it("если минимальный платёж меньше процентов — пересчитываем с процентами сверху и помечаем", () => {
    const r = simulateCard({ ...base, annualRate: 60, minPayPercent: 2 }, { kind: "minimum" });
    expect(r.adjustedMinimum).toBe(true);
    expect(r.neverEnds).toBe(false);
  });
  it("слишком маленький фиксированный платёж — долг не уменьшается", () => {
    const r = simulateCard(base, { kind: "fixed", amount: 2000 });
    expect(r.neverEnds).toBe(true);
  });
  it("комиссия за снятие наличных: % с минимумом", () => {
    const r = simulateCard({ ...base, cashFeePercent: 3.9, cashFeeMin: 390, graceDays: 0 }, { kind: "grace" });
    expect(r.fees.toNumber()).toBe(3900);
  });
  it("в каталоге карт реальный льготный период не длиннее рекламного и есть источник", () => {
    for (const c of CREDIT_CARDS) {
      expect(c.graceRegular).toBeLessThanOrEqual(c.graceAdvertised || 0);
      expect(c.sourceUrl).toMatch(/^https:\/\//);
      expect(c.rateMin).toBeLessThanOrEqual(c.rateMax);
      // Если реклама обещает больше, должно быть простыми словами сказано, когда
      if (c.graceAdvertised > c.graceRegular) expect(c.graceAdvertisedWhen).toBeTruthy();
    }
  });
});
