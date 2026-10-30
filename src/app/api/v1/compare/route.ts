import { compareSchema } from "@/lib/api/schemas";
import { handle, preflight } from "@/lib/api/handler";
import { compareOffers } from "@/lib/finance/compare";

export const OPTIONS = preflight;

export async function POST(req: Request) {
  return handle(req, compareSchema, ({ offers, startDate, accrual }) => {
    const c = compareOffers(offers, startDate, accrual);
    return {
      best: c.best.offer.name,
      rankedBy: c.sameTerms ? "overpayment" : "psk",
      spread: c.spread,
      offers: c.results.map((r) => ({
        name: r.offer.name, rank: r.rank, monthlyPayment: r.payment, totalOutflow: r.totalOutflow,
        overpayment: r.overpayment, pskPercent: r.psk, earlyRepayment: r.offer.earlyRepayment ?? null,
      })),
    };
  });
}
