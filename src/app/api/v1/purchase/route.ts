import { purchaseSchema } from "@/lib/api/schemas";
import { handle, preflight } from "@/lib/api/handler";
import { comparePurchase } from "@/lib/finance/purchase";

export const OPTIONS = preflight;

export async function POST(req: Request) {
  return handle(req, purchaseSchema, (input) => comparePurchase(input));
}
