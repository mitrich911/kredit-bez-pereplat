import { z } from "zod";
import { parseDate } from "./finance/dates";

const money = z.number().finite().min(0).max(1_000_000_000_000);
const percent = z.number().finite().min(0).max(100);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  try { parseDate(value); return true; } catch { return false; }
});

const state = z.object({
  price: money.positive(), down: money, rate: percent, years: z.number().int().min(1).max(40),
  paymentType: z.enum(["annuity", "differentiated"]), accrual: z.enum(["daily", "monthly"]),
  startDate: date, insurancePercent: percent, insuranceFixedYearly: money,
  oneTimeCosts: money, monthlyFees: money, existing: z.boolean(),
}).refine((value) => value.down < value.price);

const prepayment = z.object({
  kind: z.enum(["once", "monthly", "yearly"]), amount: money.positive(),
  month: z.number().int().min(1).max(480), untilMonth: z.number().int().min(1).max(480).optional(),
  mode: z.enum(["term", "payment"]),
});

const shared = z.object({ version: z.literal(1), state, prepayments: z.array(prepayment).max(24) });

export type SharedMortgage = z.infer<typeof shared>;

/** Never includes income, savings or the financial reserve. */
export function mortgageShareUrl(pageUrl: string, input: SharedMortgage): string | null {
  const parsed = shared.safeParse(input);
  if (!parsed.success) return null;
  const url = new URL(pageUrl);
  url.searchParams.set("calc", JSON.stringify(parsed.data));
  return url.toString().length <= 8000 ? url.toString() : null;
}

export function readSharedMortgage(search: string): SharedMortgage | null {
  const raw = new URLSearchParams(search).get("calc");
  if (!raw || raw.length > 5000) return null;
  try {
    const parsed = shared.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
