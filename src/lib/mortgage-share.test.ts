import { describe, expect, it } from "vitest";
import { mortgageShareUrl, readSharedMortgage, type SharedMortgage } from "./mortgage-share";

const example: SharedMortgage = {
  version: 1,
  state: {
    price: 7_000_000, down: 1_400_000, rate: 16, years: 20,
    paymentType: "annuity", accrual: "daily", startDate: "2026-11-01",
    insurancePercent: 0.5, insuranceFixedYearly: 0, oneTimeCosts: 50_000,
    monthlyFees: 0, existing: false,
  },
  prepayments: [{ kind: "monthly", amount: 5_000, month: 1, mode: "term" }],
};

describe("mortgage sharing", () => {
  it("restores the loan conditions and early payments from a link", () => {
    const url = mortgageShareUrl("https://example.com/kredit-bez-pereplat/ipoteka/", example);
    expect(url).not.toBeNull();
    expect(readSharedMortgage(new URL(url!).search)).toEqual(example);
  });

  it("rejects invalid outside values before they enter the calculator", () => {
    const changed = { ...example, state: { ...example.state, years: 999 } };
    expect(readSharedMortgage(`?calc=${encodeURIComponent(JSON.stringify(changed))}`)).toBeNull();
  });
});
