import { describe, expect, it } from "vitest";
import { rankOffers } from "./bank-pick";
import { BANK_OFFERS, type BankOffer } from "@/data/bank-offers";

const offer = (patch: Partial<BankOffer>): BankOffer => ({
  id: "x", bank: "Банк", product: "cash", title: "Кредит", rateMin: 20, rateMax: 30, pskMin: 20, pskMax: 30,
  conditions: [], sourceUrl: "https://example.ru", checkedAt: "2026-10-29", ...patch,
});

describe("подбор предложений банков", () => {
  it("ставит выше предложение с меньшей ПСК, а без цифр — в конец", () => {
    const r = rankOffers(
      [offer({ id: "a", pskMin: 25 }), offer({ id: "b", pskMin: 18 }), offer({ id: "c", rateMin: null, rateMax: null, pskMin: null })],
      "cash", 500_000, 36, "2026-11-01",
    );
    expect(r.map((x) => x.offer.id)).toEqual(["b", "a", "c"]);
    expect(r[2].best).toBeNull();
  });
  it("предложение с превышением лимита суммы уходит вниз и объясняет почему", () => {
    const r = rankOffers([offer({ id: "a", pskMin: 15, amountMax: 100_000 }), offer({ id: "b", pskMin: 25 })], "cash", 500_000, 36, "2026-11-01");
    expect(r[0].offer.id).toBe("b");
    expect(r[1].limits[0]).toContain("лимита");
  });
  it("лучший случай дешевле худшего", () => {
    const [r] = rankOffers([offer({})], "cash", 500_000, 36, "2026-11-01");
    expect(r.best!.overpayment.lessThan(r.worst!.overpayment)).toBe(true);
  });
  it("в каталоге у каждого предложения есть источник и дата проверки", () => {
    for (const o of BANK_OFFERS) {
      expect(o.sourceUrl).toMatch(/^https:\/\//);
      expect(o.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (o.rateMin !== null && o.rateMax !== null) expect(o.rateMin).toBeLessThanOrEqual(o.rateMax);
      if (o.pskMin !== null && o.pskMax !== null) expect(o.pskMin).toBeLessThanOrEqual(o.pskMax);
    }
  });
});
