import { describe, expect, it } from "vitest";
import { isBankOfferCurrent } from "./bank-freshness";

describe("isBankOfferCurrent", () => {
  it("stops recommending a rate after 30 days", () => {
    expect(isBankOfferCurrent("2026-10-29", "2026-11-28")).toBe(true);
    expect(isBankOfferCurrent("2026-10-29", "2026-11-29")).toBe(false);
  });

  it("rejects dates in the future", () => {
    expect(isBankOfferCurrent("2026-11-01", "2026-10-30")).toBe(false);
  });
});
