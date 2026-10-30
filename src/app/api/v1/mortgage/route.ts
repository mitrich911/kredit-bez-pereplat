import { mortgageSchema } from "@/lib/api/schemas";
import { handle, preflight } from "@/lib/api/handler";
import { prepaymentEffect } from "@/lib/finance/mortgage";
import { optimize } from "@/lib/finance/optimizer";
import { adviseMortgage } from "@/lib/finance/advisor";

export const OPTIONS = preflight;

export async function POST(req: Request) {
  return handle(req, mortgageSchema, (input) => {
    const { prepayments, constraints, existingLoan, includeSchedule, ...mortgage } = input;
    const effect = prepaymentEffect(mortgage, prepayments);
    const summary = (r: typeof effect.base) => ({
      loanAmount: r.loanAmount,
      monthlyPayment: r.schedule.firstPayment,
      months: r.schedule.months,
      payoffDate: r.schedule.payoffDate,
      totalInterest: r.schedule.totalInterest,
      totalPrepaid: r.schedule.totalExtra,
      insurance: r.insurance,
      fees: r.fees,
      loanPayments: r.loanPayments,
      overpayment: r.overpayment,
      fullPurchaseCost: r.fullCost,
      pskPercent: r.psk,
      ...(includeSchedule ? { schedule: r.schedule.rows } : {}),
    });
    const out: Record<string, unknown> = {
      base: summary(effect.base),
      withPrepayments: prepayments.length ? summary(effect.withPrepayments) : null,
      savings: prepayments.length
        ? { interest: effect.interestSaved, insurance: effect.insuranceSaved, fees: effect.feesSaved, total: effect.totalSaved, monthsSaved: effect.monthsSaved }
        : null,
    };
    if (constraints) {
      const opt = optimize(mortgage, constraints, existingLoan ? "existing" : "planning");
      out.scenarios = opt.scenarios.map((s) => ({
        id: s.id, title: s.title, saved: s.saved, monthsSaved: s.monthsSaved, maxMonthlyLoad: s.maxMonthlyLoad,
        lumpUsed: s.lumpUsed, feasible: s.feasible, issue: s.issue ?? null, loadSharePercent: s.loadShare,
      }));
      out.recommended = opt.best.id;
      out.advice = adviseMortgage(mortgage.propertyPrice, effect.base, opt);
    }
    return out;
  });
}
