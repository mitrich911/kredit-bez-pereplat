import { describe, expect, it } from "vitest";
import { browserStartDate, browserToday } from "./browser-date";

describe("browserStartDate", () => {
  it("moves the default to the next month after an old static build", () => {
    expect(browserStartDate(new Date(2027, 0, 15))).toBe("2027-02-01");
  });

  it("rolls December into the next year", () => {
    expect(browserStartDate(new Date(2026, 11, 31))).toBe("2027-01-01");
  });
});

it("uses the visitor's local calendar day", () => {
  expect(browserToday(new Date(2026, 9, 30))).toBe("2026-10-30");
});
