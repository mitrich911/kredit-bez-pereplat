const MAX_AGE_DAYS = 30;
const DAY_MS = 86_400_000;

/** Published bank rates need a recent manual check before we recommend them. */
export function isBankOfferCurrent(checkedAt: string, today: string): boolean {
  const age = (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${checkedAt}T00:00:00Z`)) / DAY_MS;
  return Number.isFinite(age) && age >= 0 && age <= MAX_AGE_DAYS;
}
