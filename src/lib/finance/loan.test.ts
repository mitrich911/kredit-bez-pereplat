import { describe, expect, it } from "vitest";
import { annuityPayment, buildSchedule, accrueInterest, balanceOn } from "./loan";
import { addMonths, splitByYears } from "./dates";
import { d } from "./money";

describe("даты", () => {
  it("переносит 31-е число на конец короткого месяца", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-01-31", 2)).toBe("2026-03-31");
    expect(addMonths("2026-11-15", 3)).toBe("2027-02-15");
  });
  it("делит период по годам с учётом високосного", () => {
    expect(splitByYears("2027-12-15", "2028-01-15")).toEqual([
      { days: 16, yearDays: 365 },
      { days: 15, yearDays: 366 },
    ]);
  });
});

describe("аннуитет", () => {
  it("1 000 000 ₽ под 12% на 12 месяцев — 88 848,79 ₽", () => {
    expect(annuityPayment(1_000_000, 12, 12).toFixed(2)).toBe("88848.79");
  });
  it("нулевая ставка — долг делится поровну", () => {
    expect(annuityPayment(120_000, 0, 12).toFixed(2)).toBe("10000.00");
    const s = buildSchedule({ principal: 120_000, annualRate: 0, termMonths: 12, paymentType: "annuity", startDate: "2026-01-15" });
    expect(s.totalInterest.toNumber()).toBe(0);
    expect(s.months).toBe(12);
  });
  it("долг гасится ровно до копейки, последний платёж корректируется", () => {
    const s = buildSchedule({ principal: 1_000_000, annualRate: 12, termMonths: 12, paymentType: "annuity", startDate: "2026-01-15", accrual: "monthly" });
    expect(s.totalPrincipal.toFixed(2)).toBe("1000000.00");
    expect(s.rows.at(-1)!.balance.toNumber()).toBe(0);
    // Классическая переплата для этого примера — 66 185,46 ₽ (±1 коп. на округлении)
    expect(Math.abs(s.totalInterest.toNumber() - 66185.46)).toBeLessThanOrEqual(0.02);
  });
  it("ипотека 6 млн под 20% на 30 лет — платёж 100 261,12 ₽", () => {
    expect(annuityPayment(6_000_000, 20, 360).toFixed(2)).toBe("100261.12");
  });
});

describe("дифференцированные платежи", () => {
  it("120 000 ₽ под 12% на 12 мес.: проценты 7 800 ₽", () => {
    const s = buildSchedule({ principal: 120_000, annualRate: 12, termMonths: 12, paymentType: "differentiated", startDate: "2026-01-15", accrual: "monthly" });
    expect(s.rows[0].principal.toFixed(2)).toBe("10000.00");
    expect(s.rows[0].interest.toFixed(2)).toBe("1200.00");
    expect(s.totalInterest.toFixed(2)).toBe("7800.00");
    expect(s.rows[0].payment.greaterThan(s.rows[11].payment)).toBe(true);
  });
});

describe("начисление по дням", () => {
  it("31 день при 365 днях в году", () => {
    // 1 000 000 × 0,1 × 31 / 365 = 8 493,15
    expect(accrueInterest(d(1_000_000), 10, "2026-01-15", "2026-02-15", "daily").toFixed(2)).toBe("8493.15");
  });
  it("переход через новый год в високосный", () => {
    // 1 000 000 × 0,1 × (16/365 + 15/366) = 4383,56 + 4098,36
    expect(accrueInterest(d(1_000_000), 10, "2027-12-15", "2028-01-15", "daily").toFixed(2)).toBe("8481.92");
  });
});

describe("досрочное погашение", () => {
  const base = { principal: 3_000_000, annualRate: 18, termMonths: 240, paymentType: "annuity" as const, startDate: "2026-11-01" };

  it("сокращение срока экономит больше, чем уменьшение платежа", () => {
    const plain = buildSchedule(base);
    const term = buildSchedule({ ...base, prepayments: [{ kind: "once", amount: 500_000, month: 12, mode: "term" }] });
    const pay = buildSchedule({ ...base, prepayments: [{ kind: "once", amount: 500_000, month: 12, mode: "payment" }] });
    expect(term.months).toBeLessThan(plain.months);
    expect(pay.months).toBe(plain.months);
    expect(pay.rows[12].payment.lessThan(plain.rows[12].payment)).toBe(true);
    expect(term.totalInterest.lessThan(pay.totalInterest)).toBe(true);
    expect(pay.totalInterest.lessThan(plain.totalInterest)).toBe(true);
  });

  it("ежемесячная доплата сокращает срок, долг гасится полностью", () => {
    const s = buildSchedule({ ...base, prepayments: [{ kind: "monthly", amount: 5000, month: 1, mode: "term" }] });
    expect(s.months).toBeLessThan(240);
    expect(s.rows.at(-1)!.balance.toNumber()).toBe(0);
    expect(s.totalPrincipal.plus(s.totalExtra).toFixed(2)).toBe("3000000.00");
  });

  it("ежегодный платёж вносится раз в 12 месяцев", () => {
    const s = buildSchedule({ ...base, prepayments: [{ kind: "yearly", amount: 100_000, month: 12, untilMonth: 36, mode: "term" }] });
    expect(s.rows.filter((r) => r.extra.greaterThan(0)).map((r) => r.n)).toEqual([12, 24, 36]);
  });

  it("досрочный платёж больше остатка закрывает кредит и не переплачивается", () => {
    const s = buildSchedule({ ...base, prepayments: [{ kind: "once", amount: 10_000_000, month: 3, mode: "term" }] });
    expect(s.months).toBe(3);
    expect(s.totalPrincipal.plus(s.totalExtra).toFixed(2)).toBe("3000000.00");
  });

  it("остаток долга на дату", () => {
    const s = buildSchedule(base);
    expect(balanceOn(s, 3_000_000, "2026-11-15").toNumber()).toBe(3_000_000);
    expect(balanceOn(s, 3_000_000, "2026-12-01").toFixed(2)).toBe(s.rows[0].balance.toFixed(2));
  });
});
