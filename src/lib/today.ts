import { cacheLife } from "next/cache";
import { firstOfNextMonth } from "./finance/dates";

/** Дата выдачи по умолчанию — 1-е число следующего месяца. Пересчитывается раз в день. */
export async function defaultStartDate(): Promise<string> {
  "use cache";
  cacheLife("days");
  return firstOfNextMonth(new Date());
}
