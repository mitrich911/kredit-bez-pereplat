import { formatIso } from "./finance/dates";

export function browserToday(now: Date = new Date()): string {
  return formatIso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

/** Same default as the server, using the visitor's current local month. */
export function browserStartDate(now: Date = new Date()): string {
  return formatIso(new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)));
}
