// Даты храним строками YYYY-MM-DD и считаем в UTC, чтобы часовой пояс сервера
// и браузера не сдвигал дни платежей.

const MS_PER_DAY = 86_400_000;

export function parseDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) throw new Error(`Некорректная дата: ${iso}`);
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (date.getUTCDate() !== Number(m[3])) throw new Error(`Некорректная дата: ${iso}`);
  return date;
}

export function formatIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/**
 * Дата через `months` месяцев с тем же числом. Если такого числа нет
 * (31 января + 1 месяц), берётся последний день месяца — так банки
 * переносят дату платежа.
 */
export function addMonths(iso: string, months: number): string {
  const start = parseDate(iso);
  const day = start.getUTCDate();
  const total = start.getUTCMonth() + months;
  const year = start.getUTCFullYear() + Math.floor(total / 12);
  const month = ((total % 12) + 12) % 12;
  const clamped = Math.min(day, daysInMonth(year, month));
  return formatIso(new Date(Date.UTC(year, month, clamped)));
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((parseDate(toIso).getTime() - parseDate(fromIso).getTime()) / MS_PER_DAY);
}

/**
 * Делит период (from, to] по календарным годам: проценты за дни
 * високосного года считаются от 366 дней, остальные — от 365.
 */
export function splitByYears(fromIso: string, toIso: string): { days: number; yearDays: number }[] {
  // Дни периода — с дня, следующего за `from`, по `to` включительно.
  const parts: { days: number; yearDays: number }[] = [];
  const firstYear = parseDate(fromIso).getUTCFullYear();
  const lastYear = parseDate(toIso).getUTCFullYear();
  for (let year = firstYear; year <= lastYear; year++) {
    const prevYearEnd = `${year - 1}-12-31`;
    const yearEnd = `${year}-12-31`;
    const segStart = fromIso > prevYearEnd ? fromIso : prevYearEnd;
    const segEnd = toIso < yearEnd ? toIso : yearEnd;
    const days = daysBetween(segStart, segEnd);
    if (days > 0) parts.push({ days, yearDays: daysInYear(year) });
  }
  return parts;
}

/** Первое число следующего месяца относительно переданной даты. */
export function firstOfNextMonth(today: Date): string {
  return formatIso(new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)));
}

const MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
const MONTHS_NOMINATIVE = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

export function formatRuDate(iso: string): string {
  const date = parseDate(iso);
  return `${date.getUTCDate()} ${MONTHS_GENITIVE[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

const MONTHS_PREPOSITIONAL = [
  "январе", "феврале", "марте", "апреле", "мае", "июне",
  "июле", "августе", "сентябре", "октябре", "ноябре", "декабре",
];

/** «в июне 2041» */
export function formatInRuMonth(iso: string): string {
  const date = parseDate(iso);
  return `в ${MONTHS_PREPOSITIONAL[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function formatRuMonth(iso: string): string {
  const date = parseDate(iso);
  return `${MONTHS_NOMINATIVE[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
