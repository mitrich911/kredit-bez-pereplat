import { carSchema } from "@/lib/api/schemas";
import { handle, preflight } from "@/lib/api/handler";
import { carCostOfOwnership } from "@/lib/finance/car";

export const OPTIONS = preflight;

export async function POST(req: Request) {
  return handle(req, carSchema, ({ car, financing, options }) => carCostOfOwnership(car, financing, options));
}
