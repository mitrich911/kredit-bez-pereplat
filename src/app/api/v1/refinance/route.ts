import { refinanceSchema } from "@/lib/api/schemas";
import { handle, preflight } from "@/lib/api/handler";
import { analyzeRefinance } from "@/lib/finance/refinance";

export const OPTIONS = preflight;

export async function POST(req: Request) {
  return handle(req, refinanceSchema, (input) => analyzeRefinance(input));
}
